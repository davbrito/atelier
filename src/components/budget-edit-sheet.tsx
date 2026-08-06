import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { BudgetFormFields } from "#/components/budget-form-fields";
import { Button } from "#/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import { useIsMobile } from "#/hooks/use-mobile";
import { budgetByIdQueryOptions, queryKeys } from "#/lib/query-options";
import { budgetFormSchema, updateBudget } from "#/lib/server/budgets";
import { uploadEntityImage } from "#/lib/server/images";
import { cn } from "#/lib/utils";

type BudgetEditSheetProps = {
  budgetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BudgetEditSheet({ budgetId, open, onOpenChange }: BudgetEditSheetProps) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Fetch the full budget data when the sheet opens
  const { data: budgetData } = useQuery({
    ...budgetByIdQueryOptions(budgetId ?? ""),
    enabled: open && !!budgetId,
  });

  // Use `values` (not `defaultValues`) so the form re-syncs when budgetData
  // arrives from the query — defaultValues only runs on the first render, so
  // the form used to instantiate blank and never update.
  const form = useForm({
    resolver: zodResolver(
      budgetFormSchema.extend({
        file: z.instanceof(File).nullable().optional(),
      }),
    ),
    values: {
      name: budgetData?.name ?? "",
      description: budgetData?.description ?? "",
      hourlyRate: budgetData?.hourlyRate ?? "",
      materials:
        budgetData?.materials.map((m) => ({
          materialId: m.materialId,
          quantity: m.quantity,
        })) ?? [],
      operations:
        budgetData?.operations.map((o) => ({
          operationId: o.operationId,
          durationMinutes: o.durationMinutes,
        })) ?? [],
      deleteImage: false,
    },
  });
  const deleteImage = useWatch({ control: form.control, name: "deleteImage" });

  const updateMutation = useMutation({
    mutationFn: async ({
      data,
      file,
    }: {
      data: Parameters<typeof updateBudget>[0]["data"];
      file?: File | null;
    }) => {
      const fnData = {
        ...data,
        data: { ...data.data, imageContentType: file?.type, imageSize: file?.size },
      };
      const result = await updateBudget({ data: fnData });
      if (file && "presignedImageUrl" in result && "imageKey" in result) {
        const permanentKey = await uploadEntityImage({
          signedUrl: result.presignedImageUrl,
          file,
          entityId: result.id,
          entityType: "budgets",
          key: result.imageKey,
        });
        return { ...result, image: permanentKey, imageFailed: permanentKey === null };
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
      if ("imageFailed" in result && result.imageFailed) {
        toast.warning(
          "Presupuesto actualizado, pero no se pudo subir la imagen. Intenta de nuevo.",
        );
      } else {
        toast.success("Presupuesto actualizado");
      }
      onOpenChange(false);
    },
    onError: () => toast.error("Error al actualizar el presupuesto"),
  });

  const isPending = updateMutation.isPending;

  function handleOpenChange(open: boolean) {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn("w-full sm:max-w-lg", isMobile && "max-h-[85dvh]")}
      >
        <SheetHeader>
          <SheetTitle>Editar presupuesto</SheetTitle>
        </SheetHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(({ file, ...data }) => {
              if (!budgetId) return;
              updateMutation.mutate({ data: { id: budgetId, data }, file });
            })}
            className="flex flex-1 flex-col gap-6 overflow-y-auto p-6"
          >
            <BudgetFormFields
              imageUrl={deleteImage ? null : (budgetData?.image ?? null)}
              onFileSelect={(file) => form.setValue("file", file)}
              onDeleteImage={() => form.setValue("deleteImage", true)}
            />

            <SheetFooter className="mt-auto pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Guardar cambios
              </Button>
              <SheetClose render={<Button variant="link" type="button" disabled={isPending} />}>
                Cancelar
              </SheetClose>
            </SheetFooter>
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
