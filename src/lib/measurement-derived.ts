import { findStandardMeasurement, normalizeMeasurementName } from "#/lib/constants/measurements";

const FRONT_LENGTH = "talle delantero";
const BACK_LENGTH = "talle trasero";

const isUsable = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value !== 0;

/** 1 decimal redondeado; sin decimal si el resultado es exacto (18, no 18.0). */
export function formatCm(value: number) {
  return String(Math.round(value * 10) / 10);
}

/** Valor fraccionado de patronaje (ej. `{ label: "1/4", text: "28.5" }`), o null si no aplica. */
export function getPatternFraction(name: string, value: number | null | undefined) {
  const fraction = findStandardMeasurement(name)?.fraction;
  if (!fraction || !isUsable(value)) return null;
  return { label: fraction.label, text: formatCm(value / fraction.divisor) };
}

/**
 * Diferencia de talles (delantero − trasero) = profundidad de pinza, por id de medida.
 * Solo se calcula si ambos talles tienen valor y el delantero es >= al trasero.
 */
export function getDartDepths(measurements: { id: string; name: string; value: number }[]) {
  const find = (target: string) =>
    measurements.find((m) => normalizeMeasurementName(m.name) === target && isUsable(m.value));
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
