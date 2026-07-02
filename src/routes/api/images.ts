import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import { budget, material, member } from "#/db/schema";
import { authenticatedMiddleware } from "#/lib/auth/functions";
import { getStorage } from "#/lib/storage";

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
      GET: async ({ context }) => {
        const { url, db, user } = context;
        const key = url.searchParams.get("key");
        if (!key) {
          return new Response("Missing image key", { status: 400 });
        }

        if (!(await canAccessImage(db, user.id, key))) {
          return new Response("Image not found", { status: 404 });
        }

        const data = await getStorage().getItemRaw<R2ObjectBody>(key, {
          type: "object",
        });
        if (!data) {
          return new Response("Image not found", { status: 404 });
        }

        const headers = new Headers();
        headers.set("Cache-Control", "private, max-age=86400, immutable");
        headers.set("Content-Type", data.httpMetadata?.contentType ?? "application/octet-stream");
        headers.set("Content-Length", data.size.toString());

        return new Response(data.body, { status: 200, headers });
      },
    },
  },
});
