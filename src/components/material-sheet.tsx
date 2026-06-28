import { Field } from "@base-ui/react/field";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ImageUpload } from "#/components/image-upload";
import { Button } from "#/components/ui/button";
import * as StyledField from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import { setEntityImage } from "#/lib/server/images";
import { createMaterial, type listMaterials, updateMaterial } from "#/lib/server/materials";
import { UNIT_OPTIONS, type Unit, unitSchema } from "#/lib/units";

type Material = Awaited<ReturnType<typeof listMaterials>>[number];

type MaterialSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMaterial: Material | null;
};

type MaterialFormValues = {
  name: string;
  currentPrice: string;
  unit: Unit;
  deleteImage: boolean;
  file: File | null;
};

export function MaterialSheet({ open, onOpenChange, editingMaterial }: MaterialSheetProps) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createMaterial);

  const { control, handleSubmit, reset, setValue } = useForm<MaterialFormValues>({
    values: {
      name: editingMaterial?.name ?? "",
      currentPrice: editingMaterial?.currentPrice ?? "",
      unit: editingMaterial ? unitSchema.catch("unit").parse(editingMaterial.unit) : "unit",
      deleteImage: false,
      file: null,
    },
  });
  const deleteImage = useWatch({ control, name: "deleteImage" });

  const isEdit = !!editingMaterial;

  const commitFile = async ({
    signedUrl,
    entityId,
    imageKey,
    file,
  }: {
    signedUrl: string;
    entityId: string;
    imageKey: string;
    file: File;
  }) => {
    await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    const commit = await setEntityImage({
      data: { entityType: "materials", entityId, imageKey },
    });

    if (!commit.success) {
      throw new Error("Error al subir la imagen");
    }

    return commit.permanentKey;
  };

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      file,
    }: {
      data: Parameters<typeof createFn>[0]["data"];
      file: File | null;
    }) => {
      const fnData = { ...data, imageContentType: file?.type };
      const result = await createFn({ data: fnData });
      if (file && "presignedImageUrl" in result && "imageKey" in result) {
        const permanentKey = await commitFile({
          signedUrl: result.presignedImageUrl,
          entityId: result.id,
          imageKey: result.imageKey,
          file,
        });
        return { ...result, image: permanentKey };
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material creado correctamente");
      onOpenChange(false);
    },
    onError: () => toast.error("Error al crear el material"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      data,
      file,
    }: {
      data: Parameters<typeof updateMaterial>[0]["data"];
      file: File | null;
    }) => {
      const fnData = { ...data, imageContentType: file?.type };
      const result = await updateMaterial({ data: fnData });
      if (file && "presignedImageUrl" in result && "imageKey" in result) {
        const permanentKey = await commitFile({
          signedUrl: result.presignedImageUrl,
          entityId: result.id,
          imageKey: result.imageKey,
          file,
        });
        return { ...result, image: permanentKey };
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material actualizado");
      onOpenChange(false);
    },
    onError: () => toast.error("Error al actualizar el material"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar material" : "Nuevo material"}</SheetTitle>
          <SheetDescription>
            Ingresa los detalles del material para utilizarlo en tus presupuestos.
          </SheetDescription>
        </SheetHeader>

        <form
          id="material-form"
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-6"
          onSubmit={handleSubmit(({ file, ...values }) => {
            const data = {
              name: values.name,
              unit: values.unit,
              currentPrice: values.currentPrice,
              deleteImage: values.deleteImage,
            };
            const id = editingMaterial?.id;
            if (isEdit && id) {
              updateMutation.mutate({ data: { ...data, id }, file });
            } else {
              createMutation.mutate({ data, file });
            }
          })}
        >
          <StyledField.FieldGroup>
            {/* Name */}
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
                    placeholder="Ej: Tela de Lino"
                    required
                    render={<Input />}
                  />
                  <Field.Error render={<StyledField.FieldError />}>{error?.message}</Field.Error>
                </Field.Root>
              )}
            />

            {/* Unit */}
            <Controller
              name="unit"
              control={control}
              render={({ field, fieldState: { invalid, error } }) => (
                <Field.Root name="unit" render={<StyledField.Field />} invalid={invalid}>
                  <Field.Label render={<StyledField.FieldLabel />}>Unidad de medida</Field.Label>
                  <Select items={UNIT_OPTIONS} value={field.value} onValueChange={field.onChange}>
                    <Field.Control
                      ref={field.ref}
                      render={
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      }
                    />
                    <SelectContent>
                      {UNIT_OPTIONS.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Field.Error render={<StyledField.FieldError />}>{error?.message}</Field.Error>
                </Field.Root>
              )}
            />

            {/* Current Price */}
            <Controller
              name="currentPrice"
              control={control}
              render={({
                field: { name, ref, value, onBlur, onChange },
                fieldState: { invalid, error },
              }) => (
                <Field.Root name={name} invalid={invalid} render={<StyledField.Field />}>
                  <Field.Label render={<StyledField.FieldLabel />}>Precio actual ($)</Field.Label>
                  <Field.Control
                    value={value}
                    onBlur={onBlur}
                    onValueChange={onChange}
                    ref={ref}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    render={<Input />}
                  />
                  <Field.Error render={<StyledField.FieldError />}>{error?.message}</Field.Error>
                </Field.Root>
              )}
            />

            {/* Image */}
            <StyledField.Field>
              <StyledField.FieldLabel>Imagen</StyledField.FieldLabel>
              <ImageUpload
                initialImage={deleteImage ? null : (editingMaterial?.image ?? null)}
                onClear={() => {
                  setValue("deleteImage", true);
                }}
                onFileSelect={(file) => {
                  setValue("file", file);
                  if (file) setValue("deleteImage", false);
                }}
                isUploading={isPending}
              />
            </StyledField.Field>
          </StyledField.FieldGroup>
        </form>

        <SheetFooter className="mt-auto">
          <Button type="submit" disabled={isPending} form="material-form">
            {isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear material"}
          </Button>
          <SheetClose render={<Button variant="outline" type="button" />}>Cancelar</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
