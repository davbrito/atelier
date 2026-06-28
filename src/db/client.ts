import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { relations } from "./relations";

export type Db = ReturnType<typeof _createDb>;

function _createDb(connectionString: string) {
  const pool = new Client({ connectionString });

  return drizzle({ client: pool, relations });
}

export function createDb(connectionString: string) {
  return _createDb(connectionString);
}
