/** biome-ignore-all lint/suspicious/noExplicitAny: ignore */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { relations } from "./relations";

export type Db = NodePgDatabase<typeof relations>;

export type DbFull = ReturnType<typeof createDb>;

export function createDb(connectionString: string) {
  const client = new Client({ connectionString });

  return drizzle({ client, relations });
}

let isPatched = false;
export function patchPGWithTracing(tracing: Tracing) {
  if (isPatched) return;
  isPatched = true;

  const originalQuery: any = Client.prototype.query;

  // Reemplazamos el método en esta instancia específica
  Client.prototype.query = function tracedQuery(
    this: Client,
    queryText: any,
    values?: any,
    callback?: any,
  ) {
    // Si se pasa un objeto de configuración de query o un string simple
    const sqlText: string =
      typeof queryText === "string" ? queryText : queryText?.text || "unknown";
    const opName = `db: ${sqlText.slice(0, sqlText.indexOf(" ")).trim().toUpperCase()}`;

    // Abrimos el span nativo de Cloudflare de forma transparente
    return tracing.enterSpan(opName, async (span: any) => {
      span.setAttribute("db.system.name", "postgresql");
      span.setAttribute("db.query.text", sqlText);

      try {
        // Ejecutamos el query original manteniendo el contexto 'this' correcto
        return await originalQuery.apply(this, [queryText, values, callback]);
      } catch (error: any) {
        span.setAttribute("error", true);
        span.setAttribute("error.message", error.message);
        throw error;
      }
    });
  };
}
