import { createFileRoute } from "@tanstack/react-router";
import { authenticatedMiddleware } from "#/lib/auth/functions";
import { getStorage } from "#/lib/storage";

export const Route = createFileRoute("/api/images")({
  server: {
    middleware: [authenticatedMiddleware],
    handlers: {
      ANY: async ({ context: { url } }) => {
        const key = url.searchParams.get("key");
        if (!key) {
          return new Response("Missing image key", { status: 400 });
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
