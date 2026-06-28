import z from "zod";

export const UNIT_OPTIONS = [
  { label: "Metros (m)", value: "m" },
  { label: "Centímetros (cm)", value: "cm" },
  { label: "Unidad", value: "unit" },
  { label: "Rollos", value: "roll" },
] as const;

export type Unit = (typeof UNIT_OPTIONS)[number]["value"];

export const unitSchema = z.enum(UNIT_OPTIONS.map((option) => option.value));
