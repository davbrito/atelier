import crypto from "node:crypto";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth, type SecondaryStorage } from "better-auth";
import type { Db } from "#/db/client";
import * as schema from "#/db/schema";
import { isWhitelistedEmail } from "#/lib/whitelist";
import { baseConfig } from "./base-config.server";

export type AppAuth = ReturnType<typeof createAuth>;

// Derive a deterministic avatar URL from the Google sub (unique user ID).
// Re-sign-ins with the same Google account overwrite the old avatar.
function googleAvatarUrl(sub: string): string {
  const hash = crypto.createHash("sha256").update(sub).digest("hex");
  return `/uploads/avatars/${hash}.jpg`;
}

export function createAuth(db: Db, env: Env) {
  return betterAuth({
    ...baseConfig,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", transaction: true, schema }),
    user: {
      async validateUserInfo(data) {
        const allowed = await isWhitelistedEmail(db, data.user.email);
        if (!allowed) {
          return {
            error: "Email no autorizado.",
            errorDescription:
              "No tienes permiso para acceder a esta aplicación. Por favor, contacta al administrador.",
          };
        }
      },
    },
    secondaryStorage: {
      get(key) {
        return env.KV.get(key, "json");
      },
      set(key, value, ttl) {
        return env.KV.put(key, JSON.stringify(value), {
          expirationTtl: ttl,
          metadata: { createdAt: Date.now() },
        });
      },
      delete(key) {
        return env.KV.delete(key);
      },
      async getAndDelete(key) {
        const value = await env.KV.get(key, "json");
        if (value !== null) {
          await env.KV.delete(key);
        }
        return value;
      },
      async increment(key, ttl) {
        const value = await env.KV.get(key, "json");
        const newValue = (typeof value === "number" ? value : 0) + 1;
        await env.KV.put(key, JSON.stringify(newValue), {
          expirationTtl: ttl,
          metadata: { createdAt: Date.now() },
        });
        return newValue;
      },
    } satisfies SecondaryStorage,
    socialProviders: {
      google: {
        clientId: env.PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        async mapProfileToUser(profile) {
          // Download the Google profile picture and store it in our own S3 bucket
          // so we don't depend on Google's URL staying valid forever.
          try {
            const response = await fetch(profile.picture);
            if (response.ok) {
              const buffer = await response.arrayBuffer();
              const url = googleAvatarUrl(profile.sub);
              const storageKey = url.slice(1); // Remove leading slash for storage
              await env.STORAGE.put(storageKey, buffer, {
                httpMetadata: { contentType: "image/jpeg" },
                customMetadata: { source: "google-avatar" },
              });
              // Save the full URL directly for use in img src
              return { image: url };
            }
          } catch {
            // Fall through to store the Google URL as a fallback
          }
          return {
            image: profile.picture,
          };
        },
      },
    },
  });
}
