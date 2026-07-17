import { type SQL, type SQLWrapper, sql } from "drizzle-orm";
import type { Db } from "./client";

export async function selectExists(db: Db, query: SQL | SQLWrapper): Promise<boolean> {
  const {
    rows: [{ exists }],
  } = await db.execute(sql`select exists(${query}) as "exists"`);
  return exists === true;
}
