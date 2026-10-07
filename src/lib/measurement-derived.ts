import {
  findStandardMeasurement,
  MEASUREMENT_GROUPS,
  normalizeMeasurementName,
  STANDARD_MEASUREMENTS,
} from "#/lib/constants/measurements";

const FRONT_LENGTH = "talle delantero";
const BACK_LENGTH = "talle trasero";

export const isUsable = (value: number | null | undefined): value is number =>
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
  const depths = new Map<string, string>();
  const diff = getDartDifference(measurements);
  if (diff) {
    depths.set(diff.front.id, diff.text);
    depths.set(diff.back.id, diff.text);
  }
  return depths;
}

/** Talles delantero y trasero con su diferencia (ej. 45 − 42 = 3), o null si no aplica. */
export function getDartDifference<T extends { id: string; name: string; value: number }>(
  measurements: T[],
) {
  const find = (target: string) =>
    measurements.find((m) => normalizeMeasurementName(m.name) === target && isUsable(m.value));
  const front = find(FRONT_LENGTH);
  const back = find(BACK_LENGTH);
  if (!front || !back || front.value < back.value) return null;
  return { front, back, text: formatCm(front.value - back.value) };
}

const OTHER_GROUP = "Otras medidas";

/** Agrupa las medidas por sección, en el orden de los grupos; las no estándar van en "Otras medidas". */
export function groupMeasurements<T extends { name: string }>(measurements: T[]) {
  const sections = [...MEASUREMENT_GROUPS, OTHER_GROUP].map((title) => ({
    title: title as string,
    items: [] as T[],
  }));
  for (const m of measurements) {
    const group = findStandardMeasurement(m.name)?.group ?? OTHER_GROUP;
    sections.find((s) => s.title === group)?.items.push(m);
  }
  return sections.filter((s) => s.items.length > 0);
}

export type MeasurementSlot = { id: string | null; name: string; value: number | null };

/**
 * Las medidas estándar en el orden del catálogo, con hueco vacío (`id: null`) para las que
 * aún no tienen valor, seguidas de las medidas personalizadas del cliente.
 */
export function withStandardSlots(
  measurements: { id: string; name: string; value: number }[],
): MeasurementSlot[] {
  const byName = new Map<string, MeasurementSlot>();
  const custom: MeasurementSlot[] = [];
  for (const m of measurements) {
    const key = normalizeMeasurementName(m.name);
    if (!findStandardMeasurement(m.name)) custom.push(m);
    else if (!byName.has(key)) byName.set(key, m);
    else custom.push(m);
  }
  const standard = STANDARD_MEASUREMENTS.map(
    (s) => byName.get(normalizeMeasurementName(s.name)) ?? { id: null, name: s.name, value: null },
  );
  return [...standard, ...custom];
}
