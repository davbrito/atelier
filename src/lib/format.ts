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
