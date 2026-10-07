import { normalizeMeasurementName } from "#/lib/constants/measurements";

/**
 * Geometría del croquis técnico (figurín 2D). Cada vista usa un viewBox de
 * BLUEPRINT_WIDTH × BLUEPRINT_HEIGHT con la silueta centrada en `C`; las
 * etiquetas van en los márgenes izquierdo/derecho, fuera del cuerpo.
 */
export const BLUEPRINT_WIDTH = 340;
export const BLUEPRINT_HEIGHT = 500;
/** Alto útil de la vista trasera: todas sus cotas quedan por encima de los muslos. */
export const BLUEPRINT_BACK_CROP_HEIGHT = 335;

const C = BLUEPRINT_WIDTH / 2;
/** Texto de las etiquetas laterales, alineado a los bordes del dibujo. */
export const LABEL_TEXT = {
  left: { x: 6, textAnchor: "start" },
  right: { x: BLUEPRINT_WIDTH - 6, textAnchor: "end" },
} as const;

/** Espacio entre el final de la línea de referencia y el texto de la etiqueta. */
const LEADER_GAP = 3;

/**
 * Ancho aproximado (en unidades del viewBox) de una línea de texto en la fuente sans de la
 * app; suficiente para acercar la línea de referencia al texto sin medir el DOM (también
 * sirve en SSR e impresión).
 */
function estimateTextWidth(text: string, fontSize: number, bold = false) {
  return text.length * fontSize * (bold ? 0.6 : 0.55);
}

/**
 * x donde termina la línea de referencia: justo antes del texto más ancho de la etiqueta,
 * para que se vea a qué cota pertenece.
 */
export function leaderEndX(
  side: "left" | "right",
  lines: { text: string; fontSize: number; bold?: boolean }[],
) {
  const width = Math.max(...lines.map((l) => estimateTextWidth(l.text, l.fontSize, l.bold)));
  return side === "left"
    ? LABEL_TEXT.left.x + width + LEADER_GAP
    : LABEL_TEXT.right.x - width - LEADER_GAP;
}

export type BlueprintView = "front" | "back";

export type BlueprintAnnotation = {
  /** Nombre estándar (ver STANDARD_MEASUREMENTS). */
  name: string;
  /** Nombre corto para la etiqueta sobre el croquis. */
  short: string;
  view: BlueprintView;
  /**
   * `dimension`: cota entre (x1,y1) y (x2,y2) con topes en los extremos.
   * `level`: largo de prenda; guía vertical al margen de (x1,y1) a (x2,y2) y
   * línea de nivel discontinua desde `levelFromX` hasta la guía a la altura y2.
   */
  kind: "dimension" | "level";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  levelFromX?: number;
  label: { side: "left" | "right"; y: number };
};

export const BLUEPRINT_ANNOTATIONS: BlueprintAnnotation[] = [
  // ── Frente: cotas anatómicas ──
  {
    name: "Contorno cuello",
    short: "Cuello",
    view: "front",
    kind: "dimension",
    x1: C - 10,
    y1: 66,
    x2: C + 10,
    y2: 66,
    label: { side: "right", y: 60 },
  },
  {
    name: "Alto escote",
    short: "Alto escote",
    view: "front",
    kind: "dimension",
    x1: C - 4,
    y1: 70,
    x2: C - 4,
    y2: 94,
    label: { side: "left", y: 86 },
  },
  {
    name: "Alto busto",
    short: "Alto busto",
    view: "front",
    kind: "dimension",
    x1: C - 18,
    y1: 74,
    x2: C - 18,
    y2: 138,
    label: { side: "left", y: 114 },
  },
  {
    name: "Separación busto",
    short: "Sep. busto",
    view: "front",
    kind: "dimension",
    x1: C - 18,
    y1: 138,
    x2: C + 18,
    y2: 138,
    label: { side: "right", y: 138 },
  },
  {
    name: "Contorno tórax",
    short: "Tórax",
    view: "front",
    kind: "dimension",
    x1: C - 37,
    y1: 120,
    x2: C + 37,
    y2: 120,
    label: { side: "right", y: 108 },
  },
  {
    name: "Contorno busto",
    short: "Busto",
    view: "front",
    kind: "dimension",
    x1: C - 34,
    y1: 148,
    x2: C + 34,
    y2: 148,
    label: { side: "left", y: 146 },
  },
  {
    name: "Talle delantero",
    short: "Talle del.",
    view: "front",
    kind: "dimension",
    x1: C + 18,
    y1: 72,
    x2: C + 18,
    y2: 195,
    label: { side: "right", y: 170 },
  },
  {
    name: "Contorno cintura",
    short: "Cintura",
    view: "front",
    kind: "dimension",
    x1: C - 30,
    y1: 195,
    x2: C + 30,
    y2: 195,
    label: { side: "left", y: 196 },
  },
  {
    name: "Alto cadera",
    short: "Alto cadera",
    view: "front",
    kind: "dimension",
    x1: C - 10,
    y1: 195,
    x2: C - 10,
    y2: 255,
    label: { side: "left", y: 226 },
  },
  {
    name: "Contorno cadera",
    short: "Cadera",
    view: "front",
    kind: "dimension",
    x1: C - 40,
    y1: 255,
    x2: C + 40,
    y2: 255,
    label: { side: "left", y: 256 },
  },
  {
    name: "Contorno rodilla",
    short: "Rodilla",
    view: "front",
    kind: "dimension",
    x1: C - 30,
    y1: 370,
    x2: C - 2,
    y2: 370,
    label: { side: "left", y: 370 },
  },
  {
    name: "Contorno bota",
    short: "Bota",
    view: "front",
    kind: "dimension",
    x1: C - 28,
    y1: 468,
    x2: C - 4,
    y2: 468,
    label: { side: "left", y: 468 },
  },
  // ── Frente: largos de prenda (líneas de nivel al margen derecho) ──
  {
    name: "Largo camisa",
    short: "L. camisa",
    view: "front",
    kind: "level",
    x1: C + 82,
    y1: 72,
    x2: C + 82,
    y2: 282,
    levelFromX: C + 38,
    label: { side: "right", y: 282 },
  },
  {
    name: "Largo falda",
    short: "L. falda",
    view: "front",
    kind: "level",
    x1: C + 92,
    y1: 195,
    x2: C + 92,
    y2: 400,
    levelFromX: C + 30,
    label: { side: "right", y: 400 },
  },
  {
    name: "Largo pantalón",
    short: "L. pantalón",
    view: "front",
    kind: "level",
    x1: C + 102,
    y1: 195,
    x2: C + 102,
    y2: 478,
    levelFromX: C + 28,
    label: { side: "right", y: 472 },
  },
  // ── Espalda: cotas anatómicas ──
  {
    name: "Ancho espalda",
    short: "Espalda",
    view: "back",
    kind: "dimension",
    x1: C - 42,
    y1: 106,
    x2: C + 42,
    y2: 106,
    label: { side: "right", y: 96 },
  },
  {
    name: "Talle trasero",
    short: "Talle tras.",
    view: "back",
    kind: "dimension",
    x1: C,
    y1: 62,
    x2: C,
    y2: 195,
    label: { side: "left", y: 196 },
  },
  {
    name: "Contorno de brazo",
    short: "Brazo",
    view: "back",
    kind: "dimension",
    x1: C - 61,
    y1: 150,
    x2: C - 44,
    y2: 150,
    label: { side: "left", y: 150 },
  },
  {
    name: "Contorno de muñeca",
    short: "Muñeca",
    view: "back",
    kind: "dimension",
    x1: C - 71,
    y1: 246,
    x2: C - 56,
    y2: 246,
    label: { side: "left", y: 246 },
  },
  {
    name: "Largo brazo",
    short: "L. brazo",
    view: "back",
    kind: "dimension",
    x1: C + 57,
    y1: 90,
    x2: C + 78,
    y2: 248,
    label: { side: "right", y: 136 },
  },
  // ── Espalda: largos de prenda ──
  {
    name: "Largo manga",
    short: "L. manga",
    view: "back",
    kind: "level",
    x1: C + 92,
    y1: 90,
    x2: C + 92,
    y2: 212,
    levelFromX: C + 56,
    label: { side: "right", y: 212 },
  },
  {
    name: "Largo chaqueta",
    short: "L. chaqueta",
    view: "back",
    kind: "level",
    x1: C + 102,
    y1: 62,
    x2: C + 102,
    y2: 300,
    levelFromX: C + 36,
    label: { side: "right", y: 300 },
  },
];

const ANNOTATION_BY_NORMALIZED_NAME = new Map(
  BLUEPRINT_ANNOTATIONS.map((annotation) => [
    normalizeMeasurementName(annotation.name),
    annotation,
  ]),
);

export function findBlueprintAnnotation(name: string) {
  return ANNOTATION_BY_NORMALIZED_NAME.get(normalizeMeasurementName(name));
}

/** Contorno de cuerpo y piernas (sin brazos ni cabeza), simétrico respecto a C. */
export const BODY_PATH = (() => {
  const r = (dx: number) => C + dx;
  const l = (dx: number) => C - dx;
  return [
    `M${l(9)} 48 L${l(10)} 68`,
    `Q${l(28)} 72 ${l(44)} 80 Q${l(51)} 84 ${l(50)} 96`,
    `L${l(38)} 118 Q${l(36)} 140 ${l(32)} 160 Q${l(28)} 180 ${l(30)} 195`,
    `Q${l(38)} 225 ${l(40)} 255 Q${l(38)} 280 ${l(34)} 300`,
    `L${l(30)} 370 L${l(28)} 468 L${l(30)} 488 L${l(3)} 488 L${l(4)} 468 L${l(2)} 370 L${C} 300`,
    `L${r(2)} 370 L${r(4)} 468 L${r(3)} 488 L${r(30)} 488 L${r(28)} 468 L${r(30)} 370 L${r(34)} 300`,
    `Q${r(38)} 280 ${r(40)} 255 Q${r(38)} 225 ${r(30)} 195`,
    `Q${r(28)} 180 ${r(32)} 160 Q${r(36)} 140 ${r(38)} 118 L${r(50)} 96`,
    `Q${r(51)} 84 ${r(44)} 80 Q${r(28)} 72 ${r(10)} 68 L${r(9)} 48`,
  ].join(" ");
})();

/** Brazo izquierdo (lado del dibujo); el derecho se obtiene reflejando sobre C. */
export const ARM_PATH = (() => {
  const l = (dx: number) => C - dx;
  return [
    `M${l(50)} 96 Q${l(58)} 120 ${l(62)} 160 L${l(72)} 248`,
    `L${l(74)} 268 Q${l(66)} 274 ${l(58)} 268 L${l(56)} 248`,
    `L${l(45)} 160 Q${l(41)} 136 ${l(38)} 118`,
  ].join(" ");
})();

/**
 * Cabeza ovalada, más estrecha en la mandíbula: ~1/8.5 del alto total (figurín de moda) y
 * algo menos de la mitad del ancho de hombros.
 */
export const HEAD_PATH = [
  `M${C} 4`,
  `C${C + 12} 4 ${C + 19} 13 ${C + 19} 26`,
  `C${C + 19} 40 ${C + 12} 53 ${C} 56`,
  `C${C - 12} 53 ${C - 19} 40 ${C - 19} 26`,
  `C${C - 19} 13 ${C - 12} 4 ${C} 4 Z`,
].join(" ");
export const CENTER_X = C;
