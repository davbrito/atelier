import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckIcon, RulerIcon, XIcon } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useId, useState } from "react";
import { NumericFormat } from "react-number-format";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { toast } from "#/components/ui/toast.tsx";
import { getPatternFraction, type MeasurementSlot } from "#/lib/measurement-derived";
import { queryKeys } from "#/lib/query-options";
import { cn } from "#/lib/utils";
import { setClientMeasurement } from "#/server/functions/clients";

type Props = {
  clientId: string;
  measurement: MeasurementSlot;
  dart?: string;
  isActive: boolean;
  isFlashing: boolean;
  onHighlight: (name: string | null) => void;
};

/**
 * Tarjeta de medida con el valor editable en el sitio. Nunca se guarda sola: al cambiar el
 * valor aparece un botón de guardar (o Enter); Esc o el botón de descartar lo revierten.
 * Guardar el campo vacío elimina la medida.
 */
export function MeasurementCard({
  clientId,
  measurement,
  dart,
  isActive,
  isFlashing,
  onHighlight,
}: Props) {
  const queryClient = useQueryClient();
  const setMeasurementFn = useServerFn(setClientMeasurement);
  const inputId = useId();
  const saved = measurement.value ?? "";
  const [draft, setDraft] = useState<number | "">(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const isDirty = draft !== saved;

  // El valor del servidor cambió (guardado o edición desde la ficha completa): se adopta
  // salvo que haya un cambio sin guardar en curso.
  if (saved !== lastSaved) {
    setLastSaved(saved);
    if (draft === lastSaved) setDraft(saved);
  }

  const mutation = useMutation({
    mutationFn: (value: number | null) =>
      setMeasurementFn({
        data: {
          clientId,
          measurementId: measurement.id ?? undefined,
          name: measurement.name,
          value,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.client(clientId) });
      queryClient.invalidateQueries({ queryKey: ["measurement-names"] });
    },
    onError: () => {
      toast.add({ type: "error", description: `No se pudo guardar "${measurement.name}"` });
    },
  });

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!isDirty || mutation.isPending) return;
    const next = draft === "" || draft === 0 ? null : draft;
    if (next === null && measurement.id === null) {
      setDraft(saved);
      return;
    }
    mutation.mutate(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && isDirty) {
      event.preventDefault();
      setDraft(saved);
    }
  };

  const isEmpty = measurement.value === null;
  const fraction = getPatternFraction(measurement.name, measurement.value);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: el hover solo resalta la cota en el croquis (mejora visual)
    <div
      id={measurement.id ? `measurement-${measurement.id}` : undefined}
      onMouseEnter={() => onHighlight(measurement.name)}
      onMouseLeave={() => onHighlight(null)}
      className={cn(
        "flex scroll-mt-6 flex-col gap-1 rounded-lg border p-3 transition-[background-color,box-shadow] focus-within:ring-2 focus-within:ring-ring/50",
        isEmpty ? "border-dashed bg-transparent" : "bg-muted/40 hover:bg-muted/70",
        isActive && "bg-muted/70 ring-1 ring-primary/60",
        isFlashing && "ring-2 ring-primary",
      )}
    >
      <label
        htmlFor={inputId}
        className="cursor-text text-muted-foreground text-xs uppercase tracking-wide"
      >
        {measurement.name}
      </label>
      <form onSubmit={save} className="flex items-center gap-1">
        <NumericFormat
          id={inputId}
          value={draft}
          onValueChange={(v) => setDraft(v.floatValue ?? "")}
          decimalScale={2}
          allowNegative={false}
          decimalSeparator=","
          inputMode="decimal"
          autoComplete="off"
          placeholder="—"
          onFocus={(event) => {
            onHighlight(measurement.name);
            event.currentTarget.select();
          }}
          onBlur={() => onHighlight(null)}
          onKeyDown={onKeyDown}
          aria-describedby={`${inputId}-unit`}
          className={cn(
            // Mismo aspecto que <Input>: borde visible siempre, no solo al pasar el cursor.
            "w-20 min-w-0 rounded-md border border-input bg-background px-2 py-0.5 font-semibold text-lg tabular-nums leading-tight outline-none transition-colors",
            "hover:border-ring/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            "placeholder:font-normal placeholder:text-muted-foreground/60",
            isDirty && "border-primary/60 ring-2 ring-primary/20",
          )}
        />
        <span id={`${inputId}-unit`} className="text-muted-foreground text-xs">
          cm
        </span>
        {isDirty && (
          <span className="ml-auto flex gap-0.5">
            <Button
              type="submit"
              size="icon-sm"
              disabled={mutation.isPending}
              aria-label={`Guardar ${measurement.name}`}
              title={draft === "" ? "Guardar (elimina la medida)" : "Guardar"}
            >
              {mutation.isPending ? <Spinner /> : <CheckIcon />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={mutation.isPending}
              aria-label={`Descartar cambio en ${measurement.name}`}
              title="Descartar (Esc)"
              onClick={() => setDraft(saved)}
            >
              <XIcon />
            </Button>
          </span>
        )}
      </form>
      {(fraction || dart) && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {fraction && (
            <span className="rounded-full bg-background px-2 py-0.5 text-muted-foreground text-xs tabular-nums ring-1 ring-border">
              {fraction.label}: {fraction.text} cm
            </span>
          )}
          {dart && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-muted-foreground text-xs tabular-nums ring-1 ring-border">
              <RulerIcon className="size-3" />
              Dif. / Pinza: {dart} cm
            </span>
          )}
        </div>
      )}
    </div>
  );
}
