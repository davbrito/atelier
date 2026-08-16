import { Field } from "@base-ui/react/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import * as z from "zod";
import { ImageUpload } from "#/components/image-upload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import * as StyledField from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/toast.tsx";
import { PAYMENT_TYPES, paymentTypeLabel } from "#/lib/constants/payment-types";
import { formatMoney, LOCALE } from "#/lib/format";
import { queryKeys } from "#/lib/query-options";
import { uploadEntityImage } from "#/lib/server/images";
import {
  createOrderPayment,
  createOrderPaymentSchema,
  deleteOrderPayment,
} from "#/lib/server/order-payments";

type Payment = {
  id: string;
  method: string;
  amount: string;
  reference: string | null;
  notes: string | null;
  paidAt: string | Date;
  image: string | null;
};

const basePaymentFormSchema = createOrderPaymentSchema
  .omit({
    orderId: true,
    imageContentType: true,
    imageSize: true,
  })
  .extend({ file: z.instanceof(File).nullable() });

type PaymentFormValues = z.infer<typeof basePaymentFormSchema>;

function buildPaymentFormSchema(balance: number) {
  return basePaymentFormSchema.refine((values) => Number(values.amount) <= balance, {
    message: `El monto excede el saldo pendiente (${formatMoney(balance)}). No se puede pagar de más.`,
    path: ["amount"],
  });
}

export function OrderPaymentList({
  orderId,
  orderCode,
  payments,
  balance,
}: {
  orderId: string;
  orderCode: string;
  payments: Payment[];
  balance: number;
}) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [galleryImage, setGalleryImage] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<PaymentFormValues>({
    resolver: zodResolver(buildPaymentFormSchema(balance)),
    defaultValues: {
      method: PAYMENT_TYPES[0].code,
      amount: "",
      reference: "",
      notes: "",
      paidAt: "",
      file: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ file, ...data }: PaymentFormValues) => {
      const result = await createOrderPayment({
        data: { ...data, orderId, imageContentType: file?.type, imageSize: file?.size },
      });
      if (file && "presignedImageUrl" in result && "imageKey" in result) {
        const permanentKey = await uploadEntityImage({
          signedUrl: result.presignedImageUrl,
          file,
          entityId: result.id,
          entityType: "orderPayments",
          key: result.imageKey,
        });
        return { ...result, imageFailed: permanentKey === null };
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.order(orderCode) });
      if ("imageFailed" in result && result.imageFailed) {
        toast.add({
          type: "warning",
          description: "Pago registrado, pero no se pudo subir el comprobante.",
        });
      } else {
        toast.add({ type: "success", description: "Pago registrado" });
      }
      setIsCreateOpen(false);
      reset();
    },
    onError: (error) =>
      toast.add({
        type: "error",
        description: error instanceof Error ? error.message : "Error al registrar el pago",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrderPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.order(orderCode) });
      toast.add({ type: "success", description: "Pago eliminado" });
      setDeletingId(null);
    },
    onError: () => toast.add({ type: "error", description: "Error al eliminar el pago" }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Pagos</span>
        <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="size-4" />
          Registrar pago
        </Button>
      </div>

      {payments.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground text-sm">
          Aún no se han registrado pagos.
        </Card>
      ) : (
        payments.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {p.image ? (
                  <button
                    type="button"
                    onClick={() => setGalleryImage(p.image)}
                    className="shrink-0 cursor-zoom-in"
                  >
                    <img
                      src={p.image}
                      alt="Comprobante de pago"
                      className="size-12 rounded-md border object-cover transition hover:brightness-90"
                    />
                  </button>
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                    <ImageIcon className="size-4" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{paymentTypeLabel(p.method)}</p>
                  <p className="text-muted-foreground text-xs" suppressHydrationWarning>
                    {new Date(p.paidAt).toLocaleDateString(LOCALE, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {p.reference && (
                    <p className="text-muted-foreground text-xs">Ref: {p.reference}</p>
                  )}
                  {p.notes && <p className="mt-1 text-muted-foreground text-xs">{p.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{formatMoney(Number(p.amount))}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeletingId(p.id)}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}

      {galleryImage && (
        <Dialog open={!!galleryImage} onOpenChange={(open) => !open && setGalleryImage(null)}>
          <DialogContent className="max-w-3xl bg-transparent p-0 shadow-none ring-0">
            <img
              src={galleryImage}
              alt="Comprobante de pago"
              className="max-h-[85vh] w-full rounded-xl object-contain"
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              Agrega un pago recibido para el pedido {orderCode}.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          >
            <StyledField.FieldGroup>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <Field.Root name="method" render={<StyledField.Field />}>
                    <Field.Label render={<StyledField.FieldLabel />}>Tipo de pago</Field.Label>
                    <Select
                      items={PAYMENT_TYPES.map((t) => ({ label: t.label, value: t.code }))}
                      value={field.value}
                      onValueChange={(value) => value && field.onChange(value)}
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
                        {PAYMENT_TYPES.map((t) => (
                          <SelectItem key={t.code} value={t.code}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field.Root>
                )}
              />

              <Controller
                name="amount"
                control={control}
                render={({ field, fieldState: { invalid, error } }) => (
                  <Field.Root name="amount" invalid={invalid} render={<StyledField.Field />}>
                    <div className="flex items-center justify-between">
                      <Field.Label render={<StyledField.FieldLabel />}>Monto</Field.Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => field.onChange(balance.toFixed(2))}
                      >
                        Rellenar total
                      </Button>
                    </div>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        render={
                          <NumericFormat
                            name={field.name}
                            value={field.value}
                            onValueChange={(v) => field.onChange(v.value)}
                            onBlur={field.onBlur}
                            getInputRef={field.ref}
                            decimalScale={2}
                            allowNegative={false}
                            placeholder="0,00"
                            autoComplete="off"
                          />
                        }
                      />
                    </InputGroup>
                    {error?.message ? (
                      <StyledField.FieldError>{error.message}</StyledField.FieldError>
                    ) : (
                      <StyledField.FieldDescription>
                        Saldo pendiente: {formatMoney(balance)}
                      </StyledField.FieldDescription>
                    )}
                  </Field.Root>
                )}
              />

              <Controller
                name="reference"
                control={control}
                render={({ field }) => (
                  <Field.Root name="reference" render={<StyledField.Field />}>
                    <Field.Label render={<StyledField.FieldLabel />}>
                      Código / referencia (opcional)
                    </Field.Label>
                    <Field.Control
                      value={field.value}
                      onBlur={field.onBlur}
                      onValueChange={field.onChange}
                      ref={field.ref}
                      autoComplete="off"
                      render={<Input />}
                    />
                  </Field.Root>
                )}
              />

              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Field.Root name="notes" render={<StyledField.Field />}>
                    <Field.Label render={<StyledField.FieldLabel />}>Notas (opcional)</Field.Label>
                    <Field.Control
                      value={field.value}
                      onBlur={field.onBlur}
                      onValueChange={field.onChange}
                      ref={field.ref}
                      render={<Textarea />}
                    />
                  </Field.Root>
                )}
              />

              <Controller
                name="file"
                control={control}
                render={({ field }) => (
                  <Field.Root name="file" render={<StyledField.Field />}>
                    <Field.Label render={<StyledField.FieldLabel />}>
                      Comprobante (opcional)
                    </Field.Label>
                    <ImageUpload
                      initialImage={null}
                      onFileSelect={field.onChange}
                      onClear={() => field.onChange(null)}
                      isUploading={createMutation.isPending}
                    />
                  </Field.Root>
                )}
              />
            </StyledField.FieldGroup>

            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Guardando..." : "Registrar pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro de pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deletingId && deleteMutation.mutate({ data: { id: deletingId } })}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar pago"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
