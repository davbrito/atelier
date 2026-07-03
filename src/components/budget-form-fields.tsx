"use client";

import { Field } from "@base-ui/react/field";
import { useQuery } from "@tanstack/react-query";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { ImageUpload } from "#/components/image-upload";
import { MaterialCombobox } from "#/components/material-combobox";
import { OperationCombobox } from "#/components/operation-combobox";
import { Button } from "#/components/ui/button";
import * as StyledField from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import { materialsListQueryOptions } from "#/lib/query-options";
import type { budgetFormSchema } from "#/lib/server/budgets";

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

type BudgetFormFieldsProps = {
  imageUrl: string | null;
  onFileSelect?: (file: File | null) => void;
  onDeleteImage?: () => void;
};

export function BudgetFormFields({ imageUrl, onFileSelect, onDeleteImage }: BudgetFormFieldsProps) {
  const { control, setValue } = useFormContext<BudgetFormValues>();
  const deleteImage = useWatch({ control, name: "deleteImage" });

  const {
    fields: materialFields,
    append: appendMaterial,
    remove: removeMaterial,
  } = useFieldArray({ control, name: "materials" });

  const {
    fields: operationFields,
    append: appendOperation,
    remove: removeOperation,
  } = useFieldArray({ control, name: "operations" });

  return (
    <>
      <StyledField.FieldGroup>
        <Controller
          name="name"
          control={control}
          render={({
            field: { name, ref, value, onBlur, onChange },
            fieldState: { invalid, error },
          }) => (
            <Field.Root name={name} invalid={invalid}>
              <Field.Label render={<StyledField.FieldLabel />}>Nombre</Field.Label>
              <Field.Control
                value={value}
                onBlur={onBlur}
                onValueChange={onChange}
                ref={ref}
                placeholder="Ej: Vestido de novia tipo A"
                required
                render={<Input />}
              />
              <Field.Error render={<StyledField.FieldError />}>{error?.message}</Field.Error>
            </Field.Root>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({
            field: { name, ref, value, onBlur, onChange },
            fieldState: { invalid, error },
          }) => (
            <Field.Root name={name} invalid={invalid}>
              <Field.Label render={<StyledField.FieldLabel />}>Descripción</Field.Label>
              <Field.Control
                value={value}
                onBlur={onBlur}
                onValueChange={onChange}
                ref={ref}
                placeholder="Opcional"
                render={<Input />}
              />
              <Field.Error render={<StyledField.FieldError />}>{error?.message}</Field.Error>
            </Field.Root>
          )}
        />

        <Controller
          name="hourlyRate"
          control={control}
          render={({
            field: { name, ref, value, onBlur, onChange },
            fieldState: { invalid, error },
          }) => (
            <Field.Root name={name} invalid={invalid}>
              <Field.Label render={<StyledField.FieldLabel />}>Tarifa horaria ($)</Field.Label>
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

        <div className="space-y-1.5">
          <span className="font-medium text-sm">Imagen</span>
          <ImageUpload
            initialImage={deleteImage ? null : (imageUrl ?? null)}
            onClear={() => {
              onFileSelect?.(null);
              onDeleteImage?.();
            }}
            onFileSelect={(file) => {
              onFileSelect?.(file);
            }}
          />
        </div>
      </StyledField.FieldGroup>

      {/* Materials */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">Materiales</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => appendMaterial({ materialId: "", quantity: "" })}
          >
            <PlusIcon className="size-3" />
            Agregar
          </Button>
        </div>
        {materialFields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Controller
              name={`materials.${i}.materialId`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <MaterialCombobox value={value} onChange={onChange} />
              )}
            />
            <MaterialQuantityField index={i} />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(i)}>
              <MinusIcon className="size-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Operations */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">Operaciones</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => appendOperation({ operationId: "", durationMinutes: 0 })}
          >
            <PlusIcon className="size-3" />
            Agregar
          </Button>
        </div>
        {operationFields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <Controller
              name={`operations.${i}.operationId`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <OperationCombobox
                  value={value}
                  onChange={(operationId, defaultDurationMinutes) => {
                    onChange(operationId);
                    setValue(`operations.${i}.durationMinutes`, defaultDurationMinutes);
                  }}
                />
              )}
            />
            <Controller
              name={`operations.${i}.durationMinutes`}
              control={control}
              render={({ field: { value, onChange, onBlur, ref } }) => (
                <InputGroup className="w-28">
                  <InputGroupInput
                    type="number"
                    placeholder="Minutos"
                    value={value || ""}
                    onBlur={onBlur}
                    ref={ref}
                    onChange={(e) => onChange(Number(e.target.value) || 0)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>min</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              )}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeOperation(i)}>
              <MinusIcon className="size-3" />
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Quantity input for one row of the materials array. Reads `materialId` with
 * useWatch so the unit suffix updates when the material is (re)selected —
 * useFieldArray's `field.materialId` is a snapshot from the field's mount and
 * never changes.
 */
function MaterialQuantityField({ index }: { index: number }) {
  const { control } = useFormContext<BudgetFormValues>();
  const materialId = useWatch({ control, name: `materials.${index}.materialId` });
  const { data: catalogMaterials = [] } = useQuery(materialsListQueryOptions);
  const unit = catalogMaterials.find((m) => m.id === materialId)?.unit ?? "";

  return (
    <Controller
      name={`materials.${index}.quantity`}
      control={control}
      render={({ field: { value, onChange, onBlur, ref } }) => (
        <InputGroup className="w-40">
          <InputGroupInput
            type="number"
            step="0.01"
            placeholder="Cantidad"
            value={value}
            onBlur={onBlur}
            ref={ref}
            onChange={(e) => onChange(e.target.value)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>{unit}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      )}
    />
  );
}
