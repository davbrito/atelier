import { Field } from "@base-ui/react/field";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon, MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { MeasurementNameCombobox } from "#/components/measurement-name-combobox";
import { Button } from "#/components/ui/button";
import * as StyledField from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/toast.tsx";
import { useIsMobile } from "#/hooks/use-mobile";
import { STANDARD_MEASUREMENT_NAMES } from "#/lib/constants/measurements";
import { queryKeys } from "#/lib/query-options";
import { createClient, type getClientById, updateClient } from "#/lib/server/clients";
import { cn } from "#/lib/utils";

type ClientSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient: Awaited<ReturnType<typeof getClientById>> | null;
};

type MeasurementFormValue = { name: string; value: number | "" };

type ClientFormValues = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  measurements: MeasurementFormValue[];
};

function buildInitialMeasurements(
  existing: { name: string; value: number }[] | undefined,
): MeasurementFormValue[] {
  const byName = new Map((existing ?? []).map((m) => [m.name.trim().toLowerCase(), m]));

  const standard: MeasurementFormValue[] = STANDARD_MEASUREMENT_NAMES.map((name) => {
    const match = byName.get(name.toLowerCase());
    byName.delete(name.toLowerCase());
    return { name: match?.name ?? name, value: match ? match.value : "" };
  });

  const custom: MeasurementFormValue[] = [...byName.values()].map((m) => ({
    name: m.name,
    value: m.value,
  }));

  return [...standard, ...custom];
}

export function ClientSheet({ open, onOpenChange, editingClient }: ClientSheetProps) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createClient);
  const updateFn = useServerFn(updateClient);
  const isMobile = useIsMobile();

  const { control, handleSubmit, reset } = useForm<ClientFormValues>({
    values: {
      name: editingClient?.name ?? "",
      phone: editingClient?.phone ?? "",
      email: editingClient?.email ?? "",
      notes: editingClient?.notes ?? "",
      measurements: buildInitialMeasurements(editingClient?.measurements),
    },
  });

  const {
    fields: measurementFields,
    append: appendMeasurement,
    remove: removeMeasurement,
  } = useFieldArray({ control, name: "measurements" });

  const [draftMeasurement, setDraftMeasurement] = useState<MeasurementFormValue>({
    name: "",
    value: "",
  });
  const draftMeasurementValid =
    draftMeasurement.name.trim() !== "" &&
    draftMeasurement.value !== "" &&
    Number.isFinite(draftMeasurement.value);

  function commitMeasurement() {
    if (!draftMeasurementValid) return;
    appendMeasurement(draftMeasurement);
    setDraftMeasurement({ name: "", value: "" });
  }

  const isEdit = !!editingClient;

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      queryClient.invalidateQueries({ queryKey: ["measurement-names"] });
      toast.add({ type: "success", description: "Cliente creado correctamente" });
      onOpenChange(false);
    },
    onError: () => toast.add({ type: "error", description: "Error al crear el cliente" }),
  });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      queryClient.invalidateQueries({ queryKey: ["measurement-names"] });
      toast.add({ type: "success", description: "Cliente actualizado" });
      onOpenChange(false);
    },
    onError: () => toast.add({ type: "error", description: "Error al actualizar el cliente" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(isMobile && "max-h-[85dvh]")}
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</SheetTitle>
          <SheetDescription>
            Ingresa los datos de contacto, medidas y notas del cliente.
          </SheetDescription>
        </SheetHeader>

        <form
          id="client-form"
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-6"
          onSubmit={handleSubmit((values) => {
            const data = {
              name: values.name,
              phone: values.phone,
              email: values.email,
              notes: values.notes,
              measurements: values.measurements
                .filter((m) => m.name.trim() !== "" && m.value !== "" && Number.isFinite(m.value))
                .map((m) => ({ name: m.name.trim(), value: m.value as number })),
            };
            const id = editingClient?.id;
            if (isEdit && id) {
              updateMutation.mutate({ data: { id, data } });
            } else {
              createMutation.mutate({ data });
            }
          })}
        >
          <StyledField.FieldGroup>
            <Controller
              name="name"
              control={control}
              render={({
                field: { name, ref, value, onBlur, onChange },
                fieldState: { invalid, error },
              }) => (
                <Field.Root name={name} invalid={invalid} render={<StyledField.Field />}>
                  <Field.Label render={<StyledField.FieldLabel />}>Nombre</Field.Label>
                  <Field.Control
                    value={value}
                    onBlur={onBlur}
                    onValueChange={onChange}
                    ref={ref}
                    placeholder="Ej: María Pérez"
                    required
                    render={<Input />}
                  />
                  <Field.Error render={<StyledField.FieldError />}>{error?.message}</Field.Error>
                </Field.Root>
              )}
            />

            <Controller
              name="phone"
              control={control}
              render={({ field: { name, ref, value, onBlur, onChange } }) => (
                <Field.Root name={name} render={<StyledField.Field />}>
                  <Field.Label render={<StyledField.FieldLabel />}>Teléfono</Field.Label>
                  <Field.Control
                    value={value}
                    onBlur={onBlur}
                    onValueChange={onChange}
                    ref={ref}
                    placeholder="Ej: +58 412 1234567"
                    render={<Input />}
                  />
                </Field.Root>
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({
                field: { name, ref, value, onBlur, onChange },
                fieldState: { invalid, error },
              }) => (
                <Field.Root name={name} invalid={invalid} render={<StyledField.Field />}>
                  <Field.Label render={<StyledField.FieldLabel />}>Email</Field.Label>
                  <Field.Control
                    value={value}
                    onBlur={onBlur}
                    onValueChange={onChange}
                    ref={ref}
                    type="email"
                    placeholder="Ej: maria@correo.com"
                    render={<Input />}
                  />
                  <Field.Error render={<StyledField.FieldError />}>{error?.message}</Field.Error>
                </Field.Root>
              )}
            />

            <Controller
              name="notes"
              control={control}
              render={({ field: { name, ref, value, onBlur, onChange } }) => (
                <Field.Root name={name} render={<StyledField.Field />}>
                  <Field.Label render={<StyledField.FieldLabel />}>Notas</Field.Label>
                  <Field.Control
                    value={value}
                    onBlur={onBlur}
                    onValueChange={onChange}
                    ref={ref}
                    placeholder="Preferencias, alergias, observaciones..."
                    render={<Textarea />}
                  />
                </Field.Root>
              )}
            />
          </StyledField.FieldGroup>

          {/* Measurements */}
          <div className="space-y-2">
            <span className="font-medium text-sm">Medidas</span>

            {measurementFields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <Controller
                  name={`measurements.${i}.name`}
                  control={control}
                  render={({ field: { value } }) => (
                    <span className="flex-1 truncate text-xs">{value}</span>
                  )}
                />
                <Controller
                  name={`measurements.${i}.value`}
                  control={control}
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <InputGroup className="w-24">
                      <InputGroupInput
                        render={
                          <NumericFormat
                            value={value}
                            onValueChange={(v) => onChange(v.floatValue ?? "")}
                            onBlur={onBlur}
                            getInputRef={ref}
                            decimalScale={2}
                            allowNegative={false}
                            decimalSeparator=","
                            inputMode="decimal"
                          />
                        }
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>cm</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMeasurement(i)}
                >
                  <MinusIcon className="size-3" />
                </Button>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <MeasurementNameCombobox
                value={draftMeasurement.name}
                onChange={(name) => setDraftMeasurement((d) => ({ ...d, name }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitMeasurement();
                  }
                }}
                placeholder="Ej: Busto"
                className="flex-1"
              />
              <InputGroup className="w-24">
                <InputGroupInput
                  render={
                    <NumericFormat
                      value={draftMeasurement.value}
                      onValueChange={(v) =>
                        setDraftMeasurement((d) => ({ ...d, value: v.floatValue ?? "" }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitMeasurement();
                        }
                      }}
                      decimalScale={2}
                      allowNegative={false}
                      decimalSeparator=","
                      inputMode="decimal"
                    />
                  }
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>cm</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!draftMeasurementValid}
                onClick={commitMeasurement}
              >
                <PlusIcon className="size-3" />
              </Button>
            </div>
          </div>
        </form>

        <SheetFooter className="mt-auto">
          <Button type="submit" disabled={isPending} form="client-form">
            {isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear cliente"}
          </Button>
          <SheetClose render={<Button variant="outline" type="button" />}>Cancelar</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
