import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { authenticatedMiddleware } from "#/lib/auth/functions";
import { canAccessImage } from "#/lib/server/image-access";

export const Route = createFileRoute("/uploads/$")({
  server: {
    middleware: [authenticatedMiddleware],
    handlers: {
      GET: async ({ context, request }) => {
        const { db, user } = context;
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
        // Deterministic keys mean a replaced image reuses the same URL, so
        // the browser must revalidate on every load — no-cache still lets it
        // cache the bytes, so a fresh image only costs a 304, not a
        // re-download. `private` keeps shared/CDN caches (this response is
        // authorization-gated per user) from serving it to other users.
        const headers = new Headers();
        headers.set("Cache-Control", "private, no-cache");
        headers.set("ETag", object.httpEtag);

        if (!("body" in object) || object.body === null) {
          return new Response(null, { status: 304, headers });
        }

        headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
        headers.set("Content-Length", object.size.toString());

        return new Response(object.body, { status: 200, headers });
      },
    },
  },
});
