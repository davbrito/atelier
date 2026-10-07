type Fraction = { label: "1/2" | "1/4" | "1/6"; divisor: number };

const HALF: Fraction = { label: "1/2", divisor: 2 };
const QUARTER: Fraction = { label: "1/4", divisor: 4 };
const SIXTH: Fraction = { label: "1/6", divisor: 6 };

/** Fractions de patronaje por medida, indexadas por nombre normalizado. */
const FRACTION_BY_MEASUREMENT: Record<string, Fraction> = {
  "contorno cuello": SIXTH,
  "ancho espalda": HALF,
  "separacion busto": HALF,
  "contorno busto": QUARTER,
  "contorno cintura": QUARTER,
  "contorno cadera": QUARTER,
  "contorno brazo": HALF,
  "contorno muneca": HALF,
  "contorno rodilla": HALF,
  "contorno bota": HALF,
};

const FRONT_LENGTH = "talle delantero";
const BACK_LENGTH = "talle trasero";

/** Minúsculas, sin acentos y sin la preposición "de" ("Contorno de brazo" → "contorno brazo"). */
function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\bde\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const isUsable = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value !== 0;

/** 1 decimal redondeado; sin decimal si el resultado es exacto (18, no 18.0). */
export function formatCm(value: number) {
  return String(Math.round(value * 10) / 10);
}

/** Valor fraccionado de patronaje (ej. `{ label: "1/4", text: "28.5" }`), o null si no aplica. */
export function getPatternFraction(name: string, value: number | null | undefined) {
  const fraction = FRACTION_BY_MEASUREMENT[normalizeName(name)];
  if (!fraction || !isUsable(value)) return null;
  return { label: fraction.label, text: formatCm(value / fraction.divisor) };
}

/**
 * Diferencia de talles (delantero − trasero) = profundidad de pinza, por id de medida.
 * Solo se calcula si ambos talles tienen valor y el delantero es >= al trasero.
 */
export function getDartDepths(measurements: { id: string; name: string; value: number }[]) {
  const find = (target: string) =>
    measurements.find((m) => normalizeName(m.name) === target && isUsable(m.value));
  const front = find(FRONT_LENGTH);
  const back = find(BACK_LENGTH);
  const depths = new Map<string, string>();
  if (front && back && front.value >= back.value) {
    const text = formatCm(front.value - back.value);
    depths.set(front.id, text);
    depths.set(back.id, text);
  }
  return depths;
}
