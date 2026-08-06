import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { useIsMobile } from "#/hooks/use-mobile";
import { createQuotation, createQuotationSchema } from "#/lib/server/quotations";
import { cn } from "#/lib/utils";

type QuotationCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  } = useForm({
    resolver: zodResolver(createQuotationSchema),
    defaultValues: { budgetId: "", clientId: "" },
  });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Cotización creada correctamente");
      reset();
      onOpenChange(false);
    },
    onError: () => toast.error("Error al crear la cotización"),
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
            Genera una cotización congelada a partir de un presupuesto.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit((data) => createMutation.mutateAsync({ data }))}
          className="flex flex-1 flex-col gap-6 p-6"
        >
          <div className="grid gap-2">
            <span className="font-medium text-sm">Cliente</span>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <ClientCombobox value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.clientId && (
              <span className="text-destructive text-xs">Selecciona un cliente</span>
            )}
          </div>

          <div className="grid gap-2">
            <span className="font-medium text-sm">Presupuesto base</span>
            <Controller
              control={control}
              name="budgetId"
              render={({ field }) => (
                <BudgetCombobox value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.budgetId && (
              <span className="text-destructive text-xs">Selecciona un presupuesto</span>
            )}
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
