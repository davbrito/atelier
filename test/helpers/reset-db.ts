import { sql } from "drizzle-orm";
import type { Db } from "#/db/client";

/**
 * Truncates every table in the `public` schema, cascading to dependents.
 * Used between tests instead of transaction-rollback isolation because
 * several server functions (createOrder, createOrderPayment, ...) open
 * their own transactions internally, which nested rollback isolation
 * can't safely wrap.
 */
export async function resetDb(db: Db): Promise<void> {
  const tables = await db.execute<{ tablename: string }>(sql`
    select tablename from pg_tables where schemaname = 'public'
  `);

  if (tables.rows.length === 0) return;

  const tableList = tables.rows.map((row) => `"${row.tablename}"`).join(", ");
  await db.execute(sql.raw(`truncate table ${tableList} restart identity cascade`));
}
