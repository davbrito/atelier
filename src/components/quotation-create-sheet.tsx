import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon, MinusIcon, PlusIcon } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { BudgetCombobox } from "#/components/budget-combobox";
import { ClientCombobox } from "#/components/client-combobox";
import { Button } from "#/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import { toast } from "#/components/ui/toast.tsx";
import { useIsMobile } from "#/hooks/use-mobile";
import { createQuotation } from "#/lib/server/quotations";
import { cn } from "#/lib/utils";

type QuotationCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type QuotationFormValues = {
  clientId: string;
  budgets: { budgetId: string }[];
};

export function QuotationCreateSheet({ open, onOpenChange }: QuotationCreateSheetProps) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createQuotation);
  const isMobile = useIsMobile();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuotationFormValues>({
    defaultValues: { clientId: "", budgets: [{ budgetId: "" }] },
  });

  const {
    fields: budgetFields,
    append: appendBudget,
    remove: removeBudget,
  } = useFieldArray({ control, name: "budgets" });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.add({ type: "success", description: "Cotización creada correctamente" });
      reset();
      onOpenChange(false);
    },
    onError: () => toast.add({ type: "error", description: "Error al crear la cotización" }),
  });

  function handleOpenChange(next: boolean) {
    if (next) reset();
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(isMobile && "max-h-[85dvh]")}
      >
        <SheetHeader>
          <SheetTitle>Nueva cotización</SheetTitle>
          <SheetDescription>
            Genera una cotización congelada a partir de una o más prendas.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit((values) => {
            const budgetIds = values.budgets
              .map((b) => b.budgetId)
              .filter((id): id is string => id !== "");

            if (budgetIds.length === 0) {
              toast.add({ type: "error", description: "Agrega al menos una prenda" });
              return;
            }

            createMutation.mutate({ data: { clientId: values.clientId, budgetIds } });
          })}
          className="flex flex-1 flex-col gap-6 p-6"
        >
          <div className="grid gap-2">
            <span className="font-medium text-sm">Cliente</span>
            <Controller
              control={control}
              name="clientId"
              rules={{ required: true }}
              render={({ field }) => (
                <ClientCombobox value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.clientId && (
              <span className="text-destructive text-xs">Selecciona un cliente</span>
            )}
          </div>

          <div className="grid gap-2">
            <span className="font-medium text-sm">Prendas</span>
            {budgetFields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <Controller
                  control={control}
                  name={`budgets.${i}.budgetId`}
                  render={({ field }) => (
                    <BudgetCombobox value={field.value} onChange={field.onChange} />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBudget(i)}
                  disabled={budgetFields.length === 1}
                >
                  <MinusIcon className="size-3" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendBudget({ budgetId: "" })}
            >
              <PlusIcon className="size-3" />
              Agregar prenda
            </Button>
          </div>

          <SheetFooter className="mt-auto">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              Generar cotización
            </Button>
            <SheetClose render={<Button variant="outline" type="button" />}>Cancelar</SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
