import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "#/lib/auth/functions";
import { PAYMENT_TYPE_CODES } from "#/lib/constants/payment-types";
import { MAX_IMAGE_SIZE, storageMiddleware } from "#/lib/storage";
import {
  createOrderPayment as createOrderPaymentUseCase,
  deleteOrderPayment as deleteOrderPaymentUseCase,
  listOrderPayments as listOrderPaymentsUseCase,
} from "../application/order-payments";

// ── Queries ──────────────────────────────────────────────

export const listOrderPayments = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ orderId: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    listOrderPaymentsUseCase(db, activeOrganizationId, data.orderId),
  );

// ── Mutations ────────────────────────────────────────────

export const createOrderPaymentSchema = z.object({
  orderId: z.uuid(),
  method: z.enum(PAYMENT_TYPE_CODES),
  amount: z
    .string()
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "El monto debe ser mayor a 0"),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  paidAt: z.iso.datetime().optional().or(z.literal("")),
  /** When provided (with imageSize), a presigned upload URL scoped to the new payment is returned. */
  imageContentType: z.string().optional(),
  imageSize: z.number().int().positive().max(MAX_IMAGE_SIZE).optional(),
});

export const createOrderPayment = createServerFn({ method: "POST" })
  .validator(createOrderPaymentSchema)
  .middleware([organizationMiddleware, storageMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db, createEntityPresignedUrl } }) => {
    const payment = await db.transaction((tx) =>
      createOrderPaymentUseCase(tx, activeOrganizationId, data),
    );

    if (data.imageContentType && data.imageSize) {
      const presigned = await createEntityPresignedUrl(
        "orderPayments",
        payment.id,
        data.imageContentType,
        data.imageSize,
      );
      if ("code" in presigned) {
        throw new Error(presigned.message);
      }

      return { ...payment, presignedImageUrl: presigned.uploadUrl, imageKey: presigned.key };
    }

    return payment;
  });

export const deleteOrderPayment = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware, storageMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db, removeItemSafe } }) => {
    const deleted = await deleteOrderPaymentUseCase(db, activeOrganizationId, data.id);

    if (deleted.image) {
      await removeItemSafe(deleted.image);
    }

    return { success: true };
  });
