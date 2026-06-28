"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
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
import { budgetFormSchema, createBudget } from "#/lib/server/budgets";
import { uploadEntityImage } from "#/lib/server/images";
import { BudgetFormFields } from "./budget-form-fields";

type BudgetCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BudgetCreateSheet({ open, onOpenChange }: BudgetCreateSheetProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(
      budgetFormSchema.extend({
        file: z.instanceof(File).nullable(),
      }),
    ),
    defaultValues: {
      name: "",
      description: "",
      hourlyRate: "",
      materials: [],
      operations: [],
      file: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      file,
    }: {
      data: Parameters<typeof createBudget>[0]["data"];
      file: File | null;
    }) => {
      const fnData = { ...data, imageContentType: file?.type };
      const result = await createBudget({ data: fnData });
      if (file && "presignedImageUrl" in result && "imageKey" in result) {
        const permanentKey = await uploadEntityImage({
          signedUrl: result.presignedImageUrl,
          file,
          entityId: result.id,
          entityType: "budgets",
          key: result.imageKey,
        });
        return { ...result, image: permanentKey };
      }
      return result;
    },
    onSuccess: (newBudget) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Presupuesto creado");
      onOpenChange(false);
      form.reset();
      navigate({
        to: "/app/budgets/$slug",
        params: { slug: newBudget.slug },
      });
    },
    onError: () => toast.error("Error al crear el presupuesto"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nuevo presupuesto</SheetTitle>
          <SheetDescription>Define los datos básicos del presupuesto.</SheetDescription>
        </SheetHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(({ file, ...data }) => {
              createMutation.mutate({ data, file });
            })}
            className="flex flex-1 flex-col gap-6 overflow-y-auto p-6"
          >
            <BudgetFormFields
              imageUrl={null}
              onDeleteImage={() => form.setValue("deleteImage", true)}
              onFileSelect={(file) => form.setValue("file", file)}
            />

            <SheetFooter className="mt-auto pt-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Crear presupuesto
              </Button>
              <SheetClose
                render={<Button variant="link" type="button" disabled={createMutation.isPending} />}
              >
                Cancelar
              </SheetClose>
            </SheetFooter>
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
