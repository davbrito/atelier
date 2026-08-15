export { cn } from "cnfast";

/**
 * Turns a storage key (e.g. `uploads/materials/<id>.png`, no leading slash —
 * the literal R2 object key) into a root-relative URL served by the
 * `/uploads/$` route. Keys are stored without a leading slash, so using them
 * directly as an <img src> resolves relative to the current route instead
 * of the site root.
 */
export function storageUrl(key: string): string {
  return `/${key}`;
}

/**
 * Formats a quotation's budget names for compact display, e.g.
 * "Vestido y 1 más" for multiple lines, or "Sin presupuesto" when empty.
 */
export function formatBudgetNames(names: string[]): string {
  if (names.length === 0) return "Sin presupuesto";
  if (names.length === 1) return names[0];
  return `${names[0]} y ${names.length - 1} más`;
}
