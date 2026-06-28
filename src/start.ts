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
      console.error("Database error:", error);
      throw new Error("Database error");
    }
    if (error instanceof DrizzleQueryError) {
      console.error("Database query error:", error);
      throw new Error("Database query error");
    }

    throw error;
  }
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware],
    functionMiddleware: [dbErrorMiddleware],
  };
});
