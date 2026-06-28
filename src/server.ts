import handler from "@tanstack/react-start/server-entry";
import { type AppRequestContext, createContext, withContext } from "./lib/context.server";

declare module "@tanstack/react-router" {
  interface Register {
    server: {
      requestContext: AppRequestContext;
    };
  }
}

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: AppRequestContext;
    };
  }
}

const wellKnownPattern = new URLPattern({ pathname: "/.well-known/:path*" });

export default {
  async fetch(request, env, ctx) {
    if (wellKnownPattern.test(request.url)) {
      if (import.meta.env.DEV) console.log("request well-known path:", request.url);
      return new Response(null, { status: 404 });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return Response.redirect(new URL("/app", url), 302);
    }

    const context = createContext(request, env, ctx, url);
    await context.db.$client.connect();

    return withContext(context)(() => handler.fetch(request, { context }));
  },
} satisfies ExportedHandler<Cloudflare.Env>;

declare global {
  interface Env {
    BETTER_AUTH_URL: string;
  }
}
