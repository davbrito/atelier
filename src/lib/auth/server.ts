import crypto from "node:crypto";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
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
    emailAndPassword: {
      enabled: true,
      async sendResetPassword(data) {
        console.log(`User requested password reset:`, {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
        });
        await env.KV.put(`user:${data.user.id}:resets`, JSON.stringify(data, undefined, 4), {
          expirationTtl: 5 * 60,
        });
      },
    },
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
