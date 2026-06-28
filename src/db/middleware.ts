import { createMiddleware } from "@tanstack/react-start";

export const transactionMiddleware = createMiddleware().server(
  async ({ next, context }) =>
    await context.db.transaction(async (trx) => await next({ context: { trx } })),
);
