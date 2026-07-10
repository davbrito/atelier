import { Field } from "@base-ui/react/field";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon, MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { MeasurementNameCombobox } from "#/components/measurement-name-combobox";
import { Button } from "#/components/ui/button";
import * as StyledField from "#/components/ui/field";
import { Input } from "#/components/ui/input";
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
import { queryKeys } from "#/lib/query-options";
import { createClient, type getClientById, updateClient } from "#/lib/server/clients";
import { addMeasurementName } from "#/lib/server/measurement-names";

type ClientSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient: Awaited<ReturnType<typeof getClientById>> | null;
};

type ClientFormValues = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  measurements: { name: string; value: string }[];
};

export function ClientSheet({ open, onOpenChange, editingClient }: ClientSheetProps) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createClient);
  const updateFn = useServerFn(updateClient);
  const addMeasurementNameFn = useServerFn(addMeasurementName);

  const { control, handleSubmit, reset } = useForm<ClientFormValues>({
    values: {
      name: editingClient?.name ?? "",
      phone: editingClient?.phone ?? "",
      email: editingClient?.email ?? "",
      notes: editingClient?.notes ?? "",
      measurements: editingClient?.measurements ?? [],
    },
  });

  const {
    fields: measurementFields,
    prepend: prependMeasurement,
    remove: removeMeasurement,
  } = useFieldArray({ control, name: "measurements" });

  const [draftMeasurement, setDraftMeasurement] = useState({ name: "", value: "" });
  const draftMeasurementValid =
    draftMeasurement.name.trim() !== "" && draftMeasurement.value.trim() !== "";

  function commitMeasurement() {
    if (!draftMeasurementValid) return;
    prependMeasurement(draftMeasurement);
    addMeasurementNameFn({ data: { name: draftMeasurement.name.trim() } }).then(() =>
      queryClient.invalidateQueries({ queryKey: ["measurement-names"] }),
    );
    setDraftMeasurement({ name: "", value: "" });
  }

  const isEdit = !!editingClient;

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      toast.success("Cliente creado correctamente");
      onOpenChange(false);
    },
    onError: () => toast.error("Error al crear el cliente"),
  });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      toast.success("Cliente actualizado");
      onOpenChange(false);
    },
    onError: () => toast.error("Error al actualizar el cliente"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
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
              measurements: values.measurements,
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
              />
              <Input
                value={draftMeasurement.value}
                onChange={(e) => setDraftMeasurement((d) => ({ ...d, value: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitMeasurement();
                  }
                }}
                placeholder="Ej: 92 cm"
                className="w-32"
              />
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

            {measurementFields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <Controller
                  name={`measurements.${i}.name`}
                  control={control}
                  render={({ field: { value, onChange, onBlur } }) => (
                    <MeasurementNameCombobox
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="Ej: Busto"
                    />
                  )}
                />
                <Controller
                  name={`measurements.${i}.value`}
                  control={control}
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <Input
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      onBlur={onBlur}
                      ref={ref}
                      placeholder="Ej: 92 cm"
                      className="w-32"
                    />
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
