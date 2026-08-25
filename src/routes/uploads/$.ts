import { createFileRoute } from "@tanstack/react-router";
import { authMiddleware, validateSession } from "#/lib/auth/functions";
import { handleAccessUpload } from "#/lib/uploads";
import { canAccessImage } from "#/server/application/image-access";

export const Route = createFileRoute("/uploads/$")({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ context, request }) => {
        if (!validateSession(context)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

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
