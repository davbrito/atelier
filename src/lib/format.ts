import { unitSchema } from "#/lib/units";

export const LOCALE = "es-VE";

export function formatMoney(value: number) {
  return value.toLocaleString(LOCALE, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
  });
}

export function formatUnit(value: string, unit: string) {
  const u = unitSchema.safeParse(unit).data;
  const numberValue = Number(value);

  if (!u) return numberValue.toLocaleString(LOCALE);

  switch (u) {
    case "roll":
      return `${numberValue.toLocaleString(LOCALE)} rollos`;
    case "unit":
      return `${numberValue.toLocaleString(LOCALE)} rollos`;
    default:
      return numberValue.toLocaleString(LOCALE, {
        style: "unit",
        unit: u === "m" ? "meter" : u === "cm" ? "centimeter" : "unit",
        unitDisplay: "long",
      });
  }
}

/** "María José Guerra" → "MG" (primer y último nombre). */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? [parts[0], parts.at(-1)] : [parts[0]];
  return initials.map((p) => p?.[0]?.toUpperCase()).join("");
}

/**
 * ID corto de cliente para depuración y soporte (`c:mg:1a2b3c4d`), p. ej. el que aparece en
 * la ficha de taller. No es único: se usan los últimos 8 caracteres del UUIDv7, que son
 * aleatorios (los primeros son el timestamp y se repiten entre clientes creados en el mismo
 * minuto), y las iniciales reducen aún más la probabilidad de que dos clientes coincidan.
 */
export function shortClientId(client: { id: string; name: string }) {
  const initials = getInitials(client.name.normalize("NFD").replace(/\p{Diacritic}/gu, ""));
  return `c:${initials.toLowerCase()}:${client.id.slice(-8)}`;
}
