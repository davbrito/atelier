import type { KeyboardEvent } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import {
  ARM_PATH,
  BLUEPRINT_BACK_CROP_HEIGHT,
  BLUEPRINT_HEIGHT,
  BLUEPRINT_WIDTH,
  type BlueprintAnnotation,
  type BlueprintView,
  BODY_PATH,
  CENTER_X,
  findBlueprintAnnotation,
  HEAD_PATH,
  LABEL_TEXT,
  leaderEndX,
} from "#/lib/constants/blueprint";
import { normalizeMeasurementName } from "#/lib/constants/measurements";
import { formatCm, getPatternFraction, isUsable } from "#/lib/measurement-derived";
import { cn } from "#/lib/utils";

type Measurement = { id: string; name: string; value: number };

type Props = {
  measurements: Measurement[];
  view: BlueprintView;
  /** Medida resaltada (por nombre); las demás cotas se atenúan. */
  activeName?: string | null;
  onHover?: (name: string | null) => void;
  onSelect?: (measurementId: string) => void;
  /** Diferencia de talles ya calculada, para el tooltip de los talles. */
  dartText?: string | null;
  /** `print`: trazo negro de alto contraste, sin interacción; la espalda se recorta a la parte útil. */
  variant?: "screen" | "print";
  className?: string;
};

const TICK = 4;

const VIEW_TITLES: Record<BlueprintView, string> = { front: "Frente", back: "Espalda" };

export function BodyBlueprint({
  measurements,
  view,
  activeName,
  onHover,
  onSelect,
  dartText,
  variant = "screen",
  className,
}: Props) {
  const isPrint = variant === "print";
  const height = isPrint && view === "back" ? BLUEPRINT_BACK_CROP_HEIGHT : BLUEPRINT_HEIGHT;

  const items: { measurement: Measurement; annotation: BlueprintAnnotation }[] = [];
  const seen = new Set<BlueprintAnnotation>();
  for (const measurement of measurements) {
    if (!isUsable(measurement.value)) continue;
    const annotation = findBlueprintAnnotation(measurement.name);
    if (!annotation || annotation.view !== view || seen.has(annotation)) continue;
    seen.add(annotation);
    items.push({ measurement, annotation });
  }

  const activeKey = activeName ? normalizeMeasurementName(activeName) : null;
  const hasActive = items.some((i) => normalizeMeasurementName(i.annotation.name) === activeKey);

  return (
    <svg
      viewBox={`0 0 ${BLUEPRINT_WIDTH} ${height}`}
      role="img"
      aria-label={`Croquis de medidas: ${VIEW_TITLES[view].toLowerCase()}`}
      className={cn("h-auto w-full select-none", className)}
    >
      <defs>
        <clipPath id={`blueprint-clip-${view}-${variant}`}>
          <rect width={BLUEPRINT_WIDTH} height={height} />
        </clipPath>
      </defs>
      <text
        x={CENTER_X}
        y={height - 4}
        textAnchor="middle"
        className={isPrint ? undefined : "fill-muted-foreground"}
        fill={isPrint ? "#000" : undefined}
        fontSize={9}
        letterSpacing={1.5}
      >
        {VIEW_TITLES[view].toUpperCase()}
      </text>
      <Silhouette view={view} isPrint={isPrint} clipId={`blueprint-clip-${view}-${variant}`} />
      {items.map(({ measurement, annotation }) => {
        const isActive = normalizeMeasurementName(annotation.name) === activeKey;
        return (
          <Annotation
            key={annotation.name}
            annotation={annotation}
            measurement={measurement}
            isPrint={isPrint}
            isActive={isActive}
            isDimmed={hasActive && !isActive}
            dartText={dartText}
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}
    </svg>
  );
}

function Silhouette({
  view,
  isPrint,
  clipId,
}: {
  view: BlueprintView;
  isPrint: boolean;
  clipId: string;
}) {
  const stroke = isPrint ? "#000" : undefined;
  const lineClass = isPrint ? undefined : "stroke-muted-foreground/70";
  const fillClass = isPrint ? undefined : "fill-muted/50";
  const guideClass = isPrint ? undefined : "stroke-muted-foreground/40";
  return (
    <g clipPath={`url(#${clipId})`} strokeLinejoin="round" strokeLinecap="round">
      <g
        className={cn(lineClass, fillClass)}
        stroke={stroke}
        fill={isPrint ? "none" : undefined}
        strokeWidth={1.2}
      >
        <path d={BODY_PATH} />
        <path d={ARM_PATH} />
        <path d={ARM_PATH} transform={`translate(${BLUEPRINT_WIDTH} 0) scale(-1 1)`} />
        {/* Después del cuerpo, para que el mentón quede sobre el cuello */}
        <path d={HEAD_PATH} />
      </g>
      <g className={guideClass} stroke={stroke} fill="none" strokeWidth={0.6}>
        {/* Centro delantero / espalda */}
        <line
          x1={CENTER_X}
          y1={view === "front" ? 94 : 68}
          x2={CENTER_X}
          y2={300}
          strokeDasharray="4 3"
        />
        {view === "front" ? (
          <>
            {/* Escote y curvas de busto */}
            <path d={`M${CENTER_X - 10} 68 Q${CENTER_X} 96 ${CENTER_X + 10} 68`} />
            <path d={`M${CENTER_X - 30} 146 Q${CENTER_X - 18} 158 ${CENTER_X - 6} 146`} />
            <path d={`M${CENTER_X + 6} 146 Q${CENTER_X + 18} 158 ${CENTER_X + 30} 146`} />
            <circle cx={CENTER_X - 18} cy={138} r={1.2} />
            <circle cx={CENTER_X + 18} cy={138} r={1.2} />
          </>
        ) : (
          <>
            {/* Escote posterior y omóplatos */}
            <path d={`M${CENTER_X - 10} 66 Q${CENTER_X} 72 ${CENTER_X + 10} 66`} />
            <path d={`M${CENTER_X - 30} 112 Q${CENTER_X - 22} 128 ${CENTER_X - 12} 130`} />
            <path d={`M${CENTER_X + 30} 112 Q${CENTER_X + 22} 128 ${CENTER_X + 12} 130`} />
          </>
        )}
      </g>
    </g>
  );
}

function Annotation({
  annotation,
  measurement,
  isPrint,
  isActive,
  isDimmed,
  dartText,
  onHover,
  onSelect,
}: {
  annotation: BlueprintAnnotation;
  measurement: Measurement;
  isPrint: boolean;
  isActive: boolean;
  isDimmed: boolean;
  dartText?: string | null;
  onHover?: (name: string | null) => void;
  onSelect?: (measurementId: string) => void;
}) {
  const { x1, y1, x2, y2, label } = annotation;
  const text = LABEL_TEXT[label.side];
  const value = `${formatCm(measurement.value)} cm`;
  const fraction = getPatternFraction(measurement.name, measurement.value);
  const dart = isTalleName(annotation.name) && dartText ? dartText : null;
  /** Tercera línea de la etiqueta: fracción de patronaje o pinza. */
  const detail = fraction ? `${fraction.label}: ${fraction.text}` : dart ? `Pinza: ${dart}` : null;
  const leaderEnd = {
    x: leaderEndX(label.side, [
      { text: annotation.short, fontSize: 8.5 },
      { text: value, fontSize: 9.5, bold: true },
      ...(detail ? [{ text: detail, fontSize: 8 }] : []),
    ]),
    y: label.y + 3,
  };
  const leaderStart = closestPointOnSegment(annotation, leaderEnd);

  const color = isPrint ? "#000" : undefined;
  const strokeClass = isPrint
    ? undefined
    : isActive
      ? "stroke-primary"
      : "stroke-foreground/70 group-hover/cota:stroke-primary";
  const textClass = isPrint ? undefined : isActive ? "fill-primary" : "fill-foreground";
  const weight = isActive ? 2 : 1;

  const graphic = (
    <>
      {/* Área de contacto ampliada */}
      {!isPrint && (
        <>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={10} />
          <rect
            x={label.side === "left" ? 0 : leaderEnd.x}
            y={label.y - 9}
            width={label.side === "left" ? leaderEnd.x : BLUEPRINT_WIDTH - leaderEnd.x}
            height={detail ? 30 : 22}
            fill="transparent"
          />
        </>
      )}
      <g className={strokeClass} stroke={color} fill="none" strokeLinecap="round">
        <line
          x1={leaderStart.x}
          y1={leaderStart.y}
          x2={leaderEnd.x}
          y2={leaderEnd.y}
          strokeWidth={0.5}
          strokeDasharray="1.5 2"
        />
        {annotation.kind === "level" && annotation.levelFromX !== undefined && (
          <line
            x1={annotation.levelFromX}
            y1={y2}
            x2={x2 + TICK}
            y2={y2}
            strokeWidth={weight * 0.8}
            strokeDasharray="5 3"
          />
        )}
        <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={weight} />
        {ticks(annotation).map((t) => (
          <line key={`${t.x1}-${t.y1}`} {...t} strokeWidth={weight} />
        ))}
      </g>
      <text
        x={text.x}
        y={label.y}
        textAnchor={text.textAnchor}
        className={textClass}
        fill={color}
        fontSize={8.5}
      >
        {annotation.short}
        <tspan x={text.x} dy={10} fontSize={9.5} fontWeight={600}>
          {value}
        </tspan>
        {detail && (
          <tspan
            x={text.x}
            dy={9}
            fontSize={8}
            className={isPrint || isActive ? undefined : "fill-muted-foreground"}
          >
            {detail}
          </tspan>
        )}
      </text>
    </>
  );

  if (isPrint) return <g>{graphic}</g>;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(measurement.id);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // biome-ignore lint/a11y/useSemanticElements: cota dentro de un SVG; <button> no es válido aquí
          <g
            role="button"
            tabIndex={0}
            aria-label={`${measurement.name}: ${value}`}
            className={cn(
              "group/cota cursor-pointer outline-none transition-opacity focus-visible:opacity-100",
              isDimmed && "opacity-25",
            )}
            onClick={() => onSelect?.(measurement.id)}
            onKeyDown={onKeyDown}
            onMouseEnter={() => onHover?.(measurement.name)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(measurement.name)}
            onBlur={() => onHover?.(null)}
          />
        }
      >
        {graphic}
      </TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-0.5">
        <span className="font-medium">{measurement.name}</span>
        <span className="tabular-nums">{value}</span>
        {fraction && (
          <span className="tabular-nums opacity-80">
            {fraction.label}: {fraction.text} cm
          </span>
        )}
        {dart && <span className="tabular-nums opacity-80">Dif. / Pinza: {dart} cm</span>}
      </TooltipContent>
    </Tooltip>
  );
}

/** Talle delantero / trasero: llevan la diferencia de talles (pinza). */
function isTalleName(name: string) {
  return /^talle /.test(normalizeMeasurementName(name));
}

/** Topes perpendiculares en los extremos de la cota. */
function ticks({ x1, y1, x2, y2 }: BlueprintAnnotation) {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const px = (-(y2 - y1) / length) * TICK;
  const py = ((x2 - x1) / length) * TICK;
  return [
    { x1: x1 - px, y1: y1 - py, x2: x1 + px, y2: y1 + py },
    { x1: x2 - px, y1: y2 - py, x2: x2 + px, y2: y2 + py },
  ];
}

function closestPointOnSegment(
  { x1, y1, x2, y2 }: BlueprintAnnotation,
  point: { x: number; y: number },
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.min(1, Math.max(0, ((point.x - x1) * dx + (point.y - y1) * dy) / lengthSq));
  return { x: x1 + t * dx, y: y1 + t * dy };
}
