import { Field } from "@base-ui/react/field";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { CalendarIcon, Loader2Icon, MinusIcon, PlusIcon } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import * as z from "zod";
import { BudgetCombobox } from "#/components/budget-combobox";
import { ClientCombobox } from "#/components/client-combobox";
import { PageHeader } from "#/components/page-header";
import { Button, buttonVariants } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Card } from "#/components/ui/card";
import * as StyledField from "#/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/toast.tsx";
import {
  garmentStagesListQueryOptions,
  queryKeys,
  quotationByIdQueryOptions,
} from "#/lib/query-options";
import { createOrder } from "#/lib/server/orders";
import { cn } from "#/lib/utils";

const searchSchema = z.object({
  quotationId: z.uuid().optional(),
});

export const Route = createFileRoute("/_app/app/_workspace/orders/new")({
  component: NewOrderPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { quotationId } }) => ({ quotationId }),
  loader: ({ context: { queryClient }, deps: { quotationId } }) =>
    Promise.all([
      queryClient.prefetchQuery(garmentStagesListQueryOptions),
      quotationId ? queryClient.prefetchQuery(quotationByIdQueryOptions(quotationId)) : undefined,
    ]),
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
    </div>
  ),
});

function lineTotal(line: { materials: { amount: string }[]; operations: { amount: string }[] }) {
  const materials = line.materials.reduce((sum, m) => sum + Number(m.amount), 0);
  const operations = line.operations.reduce((sum, o) => sum + Number(o.amount), 0);
  return materials + operations;
}

const PRIORITY_OPTIONS = [
  { label: "Baja", value: "low" },
  { label: "Media", value: "medium" },
  { label: "Alta", value: "high" },
  { label: "Urgente", value: "urgent" },
];

type GarmentFormValue = {
  budgetId: string;
  quotationLineId: string | undefined;
  quantity: number | "";
  unitPrice: string;
  stageId: string;
  fittingDate: Date | undefined;
  notes: string;
};

type OrderFormValues = {
  clientId: string;
  priority: string;
  dueDate: Date | undefined;
  notes: string;
  garments: GarmentFormValue[];
};

function blankGarment(defaultStageId: string): GarmentFormValue {
  return {
    budgetId: "",
    quotationLineId: undefined,
    quantity: 1,
    unitPrice: "",
    stageId: defaultStageId,
    fittingDate: undefined,
    notes: "",
  };
}

function NewOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createOrder);
  const { quotationId } = Route.useSearch();

  const { data: stagesData } = useSuspenseQuery(garmentStagesListQueryOptions);
  const stages = stagesData.items;
  const defaultStageId = stages[0]?.id ?? "";

  const { data: quotation } = useQuery({
    ...quotationByIdQueryOptions(quotationId ?? ""),
    enabled: !!quotationId,
  });

  const { control, handleSubmit } = useForm<OrderFormValues>({
    values: {
      clientId: quotation?.clientId ?? "",
      priority: "medium",
      dueDate: undefined,
      notes: "",
      garments:
        quotation && quotation.lines.length > 0
          ? quotation.lines.map((line) => ({
              budgetId: line.budgetId ?? "",
              quotationLineId: line.id,
              quantity: 1,
              unitPrice: lineTotal(line).toFixed(2),
              stageId: defaultStageId,
              fittingDate: undefined,
              notes: "",
            }))
          : [blankGarment(defaultStageId)],
    },
  });

  const {
    fields: garmentFields,
    append: appendGarment,
    remove: removeGarment,
  } = useFieldArray({ control, name: "garments" });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanGarments });
      toast.add({ type: "success", description: "Pedido creado correctamente" });
      navigate({ to: "/app/orders" });
    },
    onError: () => toast.add({ type: "error", description: "Error al crear el pedido" }),
  });

  return (
    <div className="container-narrow flex flex-col gap-6">
      <PageHeader
        back
        title="Nuevo pedido"
        description={
          quotation
            ? `Prellenado desde la cotización de ${quotation.clientTitle}.`
            : "Registra el pedido, el cliente y las prendas que lo componen."
        }
      />

      <form
        id="order-form"
        className="flex flex-col gap-6"
        onSubmit={handleSubmit((values) => {
          const garments = values.garments
            .filter((g) => g.budgetId !== "")
            .map((g) => ({
              budgetId: g.budgetId,
              quotationLineId: g.quotationLineId,
              quantity: g.quantity === "" ? 1 : g.quantity,
              unitPrice: g.unitPrice || "0.00",
              stageId: g.stageId || undefined,
              fittingDate: g.fittingDate ? g.fittingDate.toISOString() : undefined,
              notes: g.notes.trim() || undefined,
            }));

          if (garments.length === 0) {
            toast.add({ type: "error", description: "Agrega al menos una prenda" });
            return;
          }

          createMutation.mutate({
            data: {
              clientId: values.clientId,
              quotationId: quotation?.id,
              priority: values.priority as "low" | "medium" | "high" | "urgent",
              dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
              notes: values.notes.trim() || undefined,
              garments,
            },
          });
        })}
      >
        <Card className="p-4">
          <StyledField.FieldGroup>
            <Controller
              name="clientId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Field.Root name="clientId" render={<StyledField.Field />}>
                  <Field.Label render={<StyledField.FieldLabel />}>Cliente</Field.Label>
                  <ClientCombobox value={field.value} onChange={field.onChange} />
                </Field.Root>
              )}
            />

            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Field.Root name="priority" render={<StyledField.Field />}>
                  <Field.Label render={<StyledField.FieldLabel />}>Prioridad</Field.Label>
                  <Select
                    items={PRIORITY_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <Field.Control
                      ref={field.ref}
                      render={
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      }
                    />
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field.Root>
              )}
            />

            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <Field.Root name="dueDate" render={<StyledField.Field />}>
                  <Field.Label render={<StyledField.FieldLabel />}>
                    Fecha de entrega (opcional)
                  </Field.Label>
                  <Popover>
                    <PopoverTrigger
                      type="button"
                      data-empty={!field.value}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "justify-between font-normal",
                        "data-[empty=true]:text-muted-foreground",
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Elegir fecha</span>}
                      <CalendarIcon className="size-4" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        defaultMonth={field.value}
                        captionLayout="dropdown"
                        onSelect={field.onChange}
                      />
                    </PopoverContent>
                  </Popover>
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
                    placeholder="Observaciones del pedido..."
                    render={<Textarea />}
                  />
                </Field.Root>
              )}
            />
          </StyledField.FieldGroup>
        </Card>

        {/* Garments */}
        <div className="space-y-3">
          <span className="font-medium text-sm">Prendas</span>

          {garmentFields.map((field, i) => (
            <Card key={field.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <Controller
                  name={`garments.${i}.budgetId`}
                  control={control}
                  render={({ field }) => (
                    <div className="flex-1">
                      <BudgetCombobox value={field.value} onChange={field.onChange} />
                    </div>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGarment(i)}
                  disabled={garmentFields.length === 1}
                >
                  <MinusIcon className="size-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Controller
                  name={`garments.${i}.quantity`}
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
                            decimalScale={0}
                            allowNegative={false}
                          />
                        }
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>uds.</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  )}
                />

                <Controller
                  name={`garments.${i}.unitPrice`}
                  control={control}
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <InputGroup className="w-32">
                      <InputGroupAddon>
                        <InputGroupText>$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        render={
                          <NumericFormat
                            value={value}
                            onValueChange={(v) => onChange(v.value)}
                            onBlur={onBlur}
                            getInputRef={ref}
                            decimalScale={2}
                            allowNegative={false}
                            placeholder="0.00"
                          />
                        }
                      />
                    </InputGroup>
                  )}
                />

                <Controller
                  name={`garments.${i}.stageId`}
                  control={control}
                  render={({ field }) => (
                    <Select
                      items={stages.map((s) => ({ label: s.name, value: s.id }))}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Etapa inicial" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendGarment(blankGarment(defaultStageId))}
          >
            <PlusIcon className="size-3" />
            Agregar prenda
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/orders" })}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            Crear pedido
          </Button>
        </div>
      </form>
    </div>
  );
}
