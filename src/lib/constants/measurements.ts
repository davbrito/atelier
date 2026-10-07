export type PatternFraction = { label: "1/2" | "1/4" | "1/6"; divisor: number };

const HALF: PatternFraction = { label: "1/2", divisor: 2 };
const QUARTER: PatternFraction = { label: "1/4", divisor: 4 };
const SIXTH: PatternFraction = { label: "1/6", divisor: 6 };

export const MEASUREMENT_GROUPS = ["Torso", "Brazos", "Falda y pantalón"] as const;
export type MeasurementGroup = (typeof MEASUREMENT_GROUPS)[number];

type StandardMeasurement = {
  name: string;
  /** Sección en la que se agrupa en la ficha del cliente. */
  group: MeasurementGroup;
  /** Fracción de patronaje a mostrar junto al valor (si aplica). */
  fraction?: PatternFraction;
};

export const STANDARD_MEASUREMENTS = [
  { name: "Contorno cuello", group: "Torso", fraction: SIXTH },
  { name: "Ancho espalda", group: "Torso", fraction: HALF },
  { name: "Talle delantero", group: "Torso" },
  { name: "Talle trasero", group: "Torso" },
  { name: "Alto busto", group: "Torso" },
  { name: "Separación busto", group: "Torso", fraction: HALF },
  { name: "Alto escote", group: "Torso" },
  { name: "Contorno tórax", group: "Torso", fraction: QUARTER },
  { name: "Contorno busto", group: "Torso", fraction: QUARTER },
  { name: "Contorno cintura", group: "Torso", fraction: QUARTER },
  { name: "Contorno cadera", group: "Torso", fraction: QUARTER },
  { name: "Alto cadera", group: "Torso" },
  { name: "Largo brazo", group: "Brazos" },
  { name: "Largo manga", group: "Brazos" },
  { name: "Largo camisa", group: "Torso" },
  { name: "Largo chaqueta", group: "Torso" },
  { name: "Contorno de brazo", group: "Brazos", fraction: HALF },
  { name: "Contorno de muñeca", group: "Brazos", fraction: HALF },
  { name: "Largo falda", group: "Falda y pantalón" },
  { name: "Largo pantalón", group: "Falda y pantalón" },
  { name: "Contorno rodilla", group: "Falda y pantalón", fraction: HALF },
  { name: "Contorno bota", group: "Falda y pantalón", fraction: HALF },
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
