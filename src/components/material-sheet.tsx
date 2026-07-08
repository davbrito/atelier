import { Field } from "@base-ui/react/field";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  Loader2Icon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ImageUpload } from "#/components/image-upload";
import { Badge } from "#/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { materialInventoryQueryOptions } from "#/lib/query-options";
import { setEntityImage } from "#/lib/server/images";
import { registerMovement } from "#/lib/server/inventory";
import { createMaterial, type listMaterials, updateMaterial } from "#/lib/server/materials";
import { UNIT_OPTIONS, type Unit, unitSchema } from "#/lib/units";
import { cn } from "#/lib/utils";

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

type MovementFormValues = {
  type: "entry" | "exit" | "adjustment";
  quantity: string;
  note: string;
};

const MOVEMENT_TYPES = [
  {
    value: "entry" as const,
    label: "Entrada",
    icon: ArrowDownToLineIcon,
    selected: "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400",
  },
  {
    value: "exit" as const,
    label: "Salida",
    icon: ArrowUpFromLineIcon,
    selected: "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400",
  },
  {
    value: "adjustment" as const,
    label: "Ajuste",
    icon: SlidersHorizontalIcon,
    selected: "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
  },
];

const MOVEMENT_TYPE_LABELS: Record<"entry" | "exit" | "adjustment", string> = {
  entry: "Entrada",
  exit: "Salida",
  adjustment: "Ajuste",
};

function formatRelativeDate(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30)
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(date));
  if (days > 0) return `hace ${days} día${days > 1 ? "s" : ""}`;
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `hace ${minutes} min`;
  return "ahora mismo";
}

type InventoryTabProps = {
  materialId: string;
  unit: string;
  enabled: boolean;
};

function InventoryTab({ materialId, unit, enabled }: InventoryTabProps) {
  const queryClient = useQueryClient();
  const registerFn = useServerFn(registerMovement);
  const unitLabel = UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? unit;

  const { data, isLoading } = useQuery({
    ...materialInventoryQueryOptions(materialId),
    enabled,
  });

  const {
    control,
    handleSubmit,
    reset: resetMovementForm,
    watch,
  } = useForm<MovementFormValues>({
    defaultValues: { type: "entry", quantity: "", note: "" },
  });
  const movementType = watch("type");

  const movementMutation = useMutation({
    mutationFn: registerFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", "inventory", materialId] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Movimiento registrado");
      resetMovementForm();
    },
    onError: () => toast.error("Error al registrar el movimiento"),
  });

  const currentStock = data?.currentStock ?? "0";
  const movements = data?.movements ?? [];
  const stockNum = Number(currentStock);

  return (
    <div className="flex flex-col gap-6 overflow-auto p-6">
      {/* Stock actual */}
      <div className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Stock actual</p>
        <p
          className={cn("mt-1 text-3xl font-bold tabular-nums", stockNum < 0 && "text-destructive")}
        >
          {stockNum.toLocaleString("es-AR", { maximumFractionDigits: 4 })}
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">{unitLabel}</span>
        </p>
      </div>

      {/* Registrar movimiento */}
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => {
          movementMutation.mutate({
            data: {
              materialId,
              type: values.type,
              quantity: values.quantity,
              note: values.note || undefined,
            },
          });
        })}
      >
        <h3 className="font-medium text-sm">Registrar movimiento</h3>

        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {MOVEMENT_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => field.onChange(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                    field.value === opt.value
                      ? opt.selected
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <opt.icon className="size-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        />

        <Controller
          name="quantity"
          control={control}
          render={({ field: { name, ref, value, onBlur, onChange } }) => (
            <Field.Root name={name} render={<StyledField.Field />}>
              <Field.Label render={<StyledField.FieldLabel />}>
                {movementType === "adjustment" ? "Cantidad final en stock" : "Cantidad"}
              </Field.Label>
              <Field.Control
                value={value}
                onBlur={onBlur}
                onValueChange={onChange}
                ref={ref}
                type="number"
                step="any"
                min="0"
                placeholder="0"
                required
                render={<Input />}
              />
            </Field.Root>
          )}
        />

        <Controller
          name="note"
          control={control}
          render={({ field: { name, ref, value, onBlur, onChange } }) => (
            <Field.Root name={name} render={<StyledField.Field />}>
              <Field.Label render={<StyledField.FieldLabel />}>Nota (opcional)</Field.Label>
              <Field.Control
                value={value}
                onBlur={onBlur}
                onValueChange={onChange}
                ref={ref}
                placeholder="Ej: Compra proveedor X"
                render={<Input />}
              />
            </Field.Root>
          )}
        />

        <Button type="submit" disabled={movementMutation.isPending}>
          {movementMutation.isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
          Registrar
        </Button>
      </form>

      {/* Historial */}
      <div>
        <h3 className="mb-3 font-medium text-sm">Historial</h3>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground/50" />
          </div>
        ) : movements.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay movimientos registrados aún.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {movements.map((m) => {
              const deltaNum = Number(m.delta);
              const isPositive = deltaNum >= 0;
              return (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-2 rounded-lg border p-3 text-xs"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          m.type === "entry"
                            ? "default"
                            : m.type === "exit"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {MOVEMENT_TYPE_LABELS[m.type]}
                      </Badge>
                      <span
                        className={cn(
                          "font-bold tabular-nums",
                          isPositive ? "text-green-600 dark:text-green-400" : "text-destructive",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {deltaNum.toLocaleString("es-AR", { maximumFractionDigits: 4 })} {unitLabel}
                      </span>
                    </div>
                    {m.note && <p className="text-muted-foreground">{m.note}</p>}
                    {m.createdByName && <p className="text-muted-foreground">{m.createdByName}</p>}
                  </div>
                  <span className="shrink-0 text-muted-foreground">
                    {formatRelativeDate(m.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function MaterialSheet({ open, onOpenChange, editingMaterial }: MaterialSheetProps) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createMaterial);
  const [activeTab, setActiveTab] = useState<"general" | "inventario">("general");

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
      setActiveTab("general");
    }
    onOpenChange(open);
  }

  const generalForm = (
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
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar material" : "Nuevo material"}</SheetTitle>
          <SheetDescription>
            Ingresa los detalles del material para utilizarlo en tus presupuestos.
          </SheetDescription>
        </SheetHeader>

        {isEdit ? (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "general" | "inventario")}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <TabsList className="mx-6 w-auto self-start">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="inventario">Inventario</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {generalForm}
            </TabsContent>
            <TabsContent
              value="inventario"
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <InventoryTab
                materialId={editingMaterial.id}
                unit={editingMaterial.unit}
                enabled={open && activeTab === "inventario"}
              />
            </TabsContent>
          </Tabs>
        ) : (
          generalForm
        )}

        {activeTab === "general" && (
          <SheetFooter className="mt-auto">
            <Button type="submit" disabled={isPending} form="material-form">
              {isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear material"}
            </Button>
            <SheetClose render={<Button variant="outline" type="button" />}>Cancelar</SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
