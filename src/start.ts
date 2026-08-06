// src/start.ts

import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { DrizzleError, DrizzleQueryError } from "drizzle-orm";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const dbErrorMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof DrizzleError) {
      console.error({
        message: "Database error:",
        error: error.message,
        cause: error.cause,
        stack: error.stack,
      });
      throw new Error("Database error");
    }
    if (error instanceof DrizzleQueryError) {
      console.error({
        message: "Database query error:",
        error: error.message,
        cause: error.cause,
        stack: error.stack,
      });
      throw new Error("Database query error");
    }

    throw error;
  }
});

const tracingMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next, method, serverFnMeta, context: { executionCtx } }) => {
    const { tracing } = executionCtx;

    return tracing.enterSpan(`${method} ${serverFnMeta.name}`, async (span) => {
      span.setAttribute("tasntack.start.server_fn.id", serverFnMeta.id);
      span.setAttribute("tasntack.start.server_fn.name", serverFnMeta.name);
      span.setAttribute("tasntack.start.server_fn.filename", serverFnMeta.filename);
      return await next();
    });
  },
);

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware],
    functionMiddleware: [tracingMiddleware, dbErrorMiddleware],
  };
});
