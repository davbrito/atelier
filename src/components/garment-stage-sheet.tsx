import { Field } from "@base-ui/react/field";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ColorPicker } from "#/components/color-picker";
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
import { Switch } from "#/components/ui/switch";
import { useIsMobile } from "#/hooks/use-mobile";
import { queryKeys } from "#/lib/query-options";
import { createGarmentStage, updateGarmentStage } from "#/lib/server/garment-stages";
import { cn } from "#/lib/utils";

type GarmentStageRow = {
  id: string;
  name: string;
  color: string | null;
  isFinalStage: boolean;
};

type GarmentStageSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStage: GarmentStageRow | null;
};

type GarmentStageFormValues = {
  name: string;
  color: string;
  isFinalStage: boolean;
};

export function GarmentStageSheet({ open, onOpenChange, editingStage }: GarmentStageSheetProps) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createGarmentStage);
  const updateFn = useServerFn(updateGarmentStage);
  const isMobile = useIsMobile();

  const { control, handleSubmit, reset } = useForm<GarmentStageFormValues>({
    values: {
      name: editingStage?.name ?? "",
      color: editingStage?.color ?? "",
      isFinalStage: editingStage?.isFinalStage ?? false,
    },
  });

  const isEdit = !!editingStage;

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.garmentStages });
      toast.success("Etapa creada correctamente");
      onOpenChange(false);
    },
    onError: () => toast.error("Error al crear la etapa"),
  });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.garmentStages });
      toast.success("Etapa actualizada");
      onOpenChange(false);
    },
    onError: () => toast.error("Error al actualizar la etapa"),
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
          <SheetTitle>{isEdit ? "Editar etapa" : "Nueva etapa"}</SheetTitle>
          <SheetDescription>
            Define el nombre, color y si esta etapa marca la prenda como terminada.
          </SheetDescription>
        </SheetHeader>

        <form
          id="garment-stage-form"
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-6"
          onSubmit={handleSubmit((values) => {
            const data = {
              name: values.name,
              color: values.color,
              isFinalStage: values.isFinalStage,
            };
            const id = editingStage?.id;
            if (isEdit && id) {
              updateMutation.mutate({ data: { id, ...data } });
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
                    placeholder="Ej: Patronaje"
                    required
                    render={<Input />}
                  />
                  <Field.Error render={<StyledField.FieldError />}>{error?.message}</Field.Error>
                </Field.Root>
              )}
            />

            <Controller
              name="color"
              control={control}
              render={({ field: { name, value, onChange }, fieldState: { invalid, error } }) => (
                <Field.Root name={name} invalid={invalid} render={<StyledField.Field />}>
                  <Field.Label render={<StyledField.FieldLabel />}>Color (opcional)</Field.Label>
                  <ColorPicker value={value} onValueChange={onChange} placeholder="Ej: #1E3A8A" />
                  <Field.Error render={<StyledField.FieldError />}>{error?.message}</Field.Error>
                </Field.Root>
              )}
            />

            <Controller
              name="isFinalStage"
              control={control}
              render={({ field: { name, value, onChange } }) => (
                <Field.Root
                  name={name}
                  render={<StyledField.Field className="flex-row items-center justify-between" />}
                >
                  <Field.Label render={<StyledField.FieldLabel />}>
                    Marca la prenda como terminada
                  </Field.Label>
                  <Switch checked={value} onCheckedChange={onChange} />
                </Field.Root>
              )}
            />
          </StyledField.FieldGroup>
        </form>

        <SheetFooter className="mt-auto">
          <Button type="submit" disabled={isPending} form="garment-stage-form">
            {isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear etapa"}
          </Button>
          <SheetClose render={<Button variant="outline" type="button" />}>Cancelar</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
