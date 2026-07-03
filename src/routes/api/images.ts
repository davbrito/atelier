import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import { budget, material, member } from "#/db/schema";
import { authenticatedMiddleware } from "#/lib/auth/functions";

const entityTypesTableMap = {
  budgets: budget,
  materials: material,
};

const uploadKeyPattern =
  /^uploads\/(materials|budgets)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.[a-z0-9]+$/;

/**
 * Only serve keys the requesting user is allowed to see:
 * - `avatars/*`: user avatars, visible to any authenticated user.
 * - `uploads/{materials|budgets}/{id}.{ext}`: entity images, visible only
 *   to members of the organization that owns the entity.
 * Everything else (tmp uploads, arbitrary bucket keys) is rejected.
 */
async function canAccessImage(db: Db, userId: string, key: string): Promise<boolean> {
  if (key.startsWith("avatars/")) return true;

  const match = key.match(uploadKeyPattern);
  if (!match) return false;

  const table = entityTypesTableMap[match[1] as keyof typeof entityTypesTableMap];
  const entityId = match[2];

  const [entity] = await db
    .select({ organizationId: table.organizationId })
    .from(table)
    .where(eq(table.id, entityId));
  if (!entity) return false;

  const memberships = await db.$count(
    member,
    and(eq(member.userId, userId), eq(member.organizationId, entity.organizationId)),
  );
  return memberships > 0;
}

export const Route = createFileRoute("/api/images")({
  server: {
    middleware: [authenticatedMiddleware],
    handlers: {
      GET: async ({ context, request }) => {
        const { url, db, user } = context;
        const key = url.searchParams.get("key");
        if (!key) {
          return new Response("Missing image key", { status: 400 });
        }

        if (!(await canAccessImage(db, user.id, key))) {
          return new Response("Image not found", { status: 404 });
        }

        // Ask R2 to only return the body if the ETag changed. When the
        // client's cache is still fresh, R2 responds without a body and we
        // return 304 — this makes uploads visible immediately (a new upload
        // gets a new ETag) without paying the bandwidth cost on every load.
        const ifNoneMatch = request.headers.get("If-None-Match") ?? undefined;
        const object = await env.STORAGE.get(key, {
          onlyIf: ifNoneMatch ? { etagDoesNotMatch: ifNoneMatch } : undefined,
        });
        if (!object) {
          return new Response("Image not found", { status: 404 });
        }
        // R2 signals a match by returning an object without a body.
        if (!("body" in object) || object.body === null) {
          return new Response(null, {
            status: 304,
            headers: {
              ETag: object.httpEtag,
              "Cache-Control": "private, max-age=86400, must-revalidate",
            },
          });
        }

        const headers = new Headers();
        headers.set("Cache-Control", "private, max-age=86400, must-revalidate");
        headers.set("ETag", object.httpEtag);
        headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
        headers.set("Content-Length", object.size.toString());

        return new Response(object.body, { status: 200, headers });
      },
    },
  },
});
