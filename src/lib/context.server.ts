import { AsyncLocalStorage } from "node:async_hooks";
import { createDb, type Db, type DbFull } from "#/db/client";
import { type AppAuth, createAuth } from "./auth/server";

const SERVER_CONTEXT = new AsyncLocalStorage<AppRequestContext>();

export type AppRequestContext = {
  url: URL;
  env: Cloudflare.Env;
  executionCtx: ExecutionContext;
  db: DbFull;
  auth: AppAuth;
  getSession: () => Promise<AppAuth["$Infer"]["Session"] | null>;
};

export function createContext(
  req: Request,
  env: Cloudflare.Env,
  ctx: ExecutionContext,
  url: URL,
): AppRequestContext {
  const db = createDb(env.HYPERDRIVE.connectionString);
  const auth = createAuth(db, env, ctx);
  let session: AppAuth["$Infer"]["Session"] | null | undefined;
  const getSession = async () =>
    await ctx.tracing.enterSpan("ctx.getSession", async () => {
      if (session === undefined) {
        session = await auth.api.getSession({ headers: req.headers });
      }
      return session;
    });

  return { db, auth, url, env, executionCtx: ctx, getSession };
}

export function withContext<T>(context: AppRequestContext, handler: () => T): T {
  return SERVER_CONTEXT.run(context, handler);
}

export function getContext(): AppRequestContext {
  const context = SERVER_CONTEXT.getStore();
  if (!context) {
    throw new Error(
      "No context available. Ensure that you are calling this function within a request handler.",
    );
  }
  return context;
}

export function getDb(): Db {
  return getContext().db;
}

export function getAuth(): AppAuth {
  return getContext().auth;
}
