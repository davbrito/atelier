export type PatternFraction = { label: "1/2" | "1/4" | "1/6"; divisor: number };

const HALF: PatternFraction = { label: "1/2", divisor: 2 };
const QUARTER: PatternFraction = { label: "1/4", divisor: 4 };
const SIXTH: PatternFraction = { label: "1/6", divisor: 6 };

type StandardMeasurement = {
  name: string;
  /** Fracción de patronaje a mostrar junto al valor (si aplica). */
  fraction?: PatternFraction;
};

export const STANDARD_MEASUREMENTS = [
  { name: "Contorno cuello", fraction: SIXTH },
  { name: "Ancho espalda", fraction: HALF },
  { name: "Talle delantero" },
  { name: "Talle trasero" },
  { name: "Alto busto" },
  { name: "Separación busto", fraction: HALF },
  { name: "Alto escote" },
  { name: "Contorno tórax" },
  { name: "Contorno busto", fraction: QUARTER },
  { name: "Contorno cintura", fraction: QUARTER },
  { name: "Contorno cadera", fraction: QUARTER },
  { name: "Alto cadera" },
  { name: "Largo brazo" },
  { name: "Largo manga" },
  { name: "Largo camisa" },
  { name: "Largo chaqueta" },
  { name: "Contorno de brazo", fraction: HALF },
  { name: "Contorno de muñeca", fraction: HALF },
  { name: "Largo falda" },
  { name: "Largo pantalón" },
  { name: "Contorno rodilla", fraction: HALF },
  { name: "Contorno bota", fraction: HALF },
] as const satisfies readonly StandardMeasurement[];

/** Minúsculas, sin acentos y sin la preposición "de" ("Contorno de brazo" → "contorno brazo"). */
export function normalizeMeasurementName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\bde\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STANDARD_BY_NORMALIZED_NAME = new Map<string, StandardMeasurement>(
  STANDARD_MEASUREMENTS.map((m) => [normalizeMeasurementName(m.name), m]),
);

export function findStandardMeasurement(name: string) {
  return STANDARD_BY_NORMALIZED_NAME.get(normalizeMeasurementName(name));
}
