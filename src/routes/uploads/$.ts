import { createFileRoute } from "@tanstack/react-router";
import { authenticatedMiddleware } from "#/lib/auth/functions";
import { canAccessImage } from "#/lib/server/image-access";

export const Route = createFileRoute("/uploads/$")({
  server: {
    middleware: [authenticatedMiddleware],
    handlers: {
      GET: async ({ context, request }) => {
        const { db, user, env } = context;
        // The route path already matches the literal R2 key (e.g.
        // "uploads/materials/<id>.png") — only the leading "/" from the URL
        // pathname needs stripping, not the "uploads/" prefix itself.
        const key = new URL(request.url).pathname.slice(1);

        if (!key) {
          return new Response("Missing image key", { status: 400 });
        }

        if (!(await canAccessImage(db, user.id, key))) {
          return new Response("Image not found", { status: 404 });
        }

        let object: R2ObjectBody | R2Object | null;

        try {
          object = await env.STORAGE.get(key, {
            onlyIf: {
              etagDoesNotMatch: request.headers.get("If-None-Match") ?? undefined,
            },
          });
        } catch (error) {
          console.error("Error fetching image from R2:", error);

          return Response.json({ error: "Failed to fetch image from storage" }, { status: 500 });
        }

        if (!object) return Response.json({ error: "Image not found" }, { status: 404 });

        // R2 signals a match by returning an object without a body.
        // Deterministic keys mean a replaced image reuses the same URL, so
        // the browser must revalidate on every load — no-cache still lets it
        // cache the bytes, so a fresh image only costs a 304, not a
        // re-download. `private` keeps shared/CDN caches (this response is
        // authorization-gated per user) from serving it to other users.
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("Cache-Control", "private, no-cache");
        headers.set("ETag", object.httpEtag);

        if (!("body" in object) || object.body === null) {
          return new Response(null, { status: 304, headers });
        }

        headers.set("Content-Length", object.size.toString());
        return new Response(object.body, { status: 200, headers });
      },
    },
  },
});
