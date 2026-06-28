import { AsyncLocalStorage } from "node:async_hooks";
import { createDb, type Db } from "#/db/client";
import { type AppAuth, createAuth } from "./auth/server";

const SERVER_CONTEXT = new AsyncLocalStorage<AppRequestContext>();

export type AppRequestContext = {
  url: URL;
  env: Cloudflare.Env;
  executionCtx: ExecutionContext;
  db: Db;
  auth: AppAuth;
};

export function createContext(
  _request: Request,
  env: Cloudflare.Env,
  ctx: ExecutionContext,
  url: URL,
): AppRequestContext {
  const db = createDb(env.HYPERDRIVE.connectionString);
  const auth = createAuth(db, env);
  return { db, auth, url, env, executionCtx: ctx };
}

export function withContext(context: AppRequestContext) {
  return function serverHandler<T>(handler: () => T): T {
    return SERVER_CONTEXT.run(context, handler);
  };
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
