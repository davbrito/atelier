import { createFileRoute } from "@tanstack/react-router";
import { authenticatedMiddleware } from "#/lib/auth/functions";
import { canAccessImage } from "#/lib/server/image-access";
import { handleAccessUpload } from "#/lib/uploads";

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

        return handleAccessUpload(env.STORAGE, key, request.headers.get("If-None-Match"));
      },
    },
  },
});
