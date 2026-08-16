import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import * as z from "zod";
import { order, orderPayment } from "#/db/schema";
import { PAYMENT_TYPE_CODES } from "#/lib/constants/payment-types";
import { organizationMiddleware } from "../auth/functions";
import { MAX_IMAGE_SIZE, storageMiddleware } from "../storage";
import { storageUrl } from "../utils";

// ── Queries ──────────────────────────────────────────────

export const listOrderPayments = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ orderId: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const rows = await db
      .select()
      .from(orderPayment)
      .where(
        and(
          eq(orderPayment.orderId, data.orderId),
          eq(orderPayment.organizationId, activeOrganizationId),
        ),
      )
      .orderBy(desc(orderPayment.paidAt));

    return rows.map((p) => ({ ...p, image: p.image && storageUrl(p.image) }));
  });

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
    const payment = await db.transaction(async (tx) => {
      // Lock the order row so two concurrent payments can't both pass the
      // balance check and jointly overpay the order.
      const [owningOrder] = await tx
        .select({ totalAmount: order.totalAmount })
        .from(order)
        .where(and(eq(order.id, data.orderId), eq(order.organizationId, activeOrganizationId)))
        .for("update");

      if (!owningOrder) throw new Error("Pedido no encontrado");

      const [{ paid }] = await tx
        .select({ paid: sql<string>`coalesce(sum(${orderPayment.amount}), 0)` })
        .from(orderPayment)
        .where(eq(orderPayment.orderId, data.orderId));

      const balance = Number(owningOrder.totalAmount) - Number(paid);
      if (Number(data.amount) > balance) {
        throw new Error(
          `El monto excede el saldo pendiente (${balance.toFixed(2)}). No se puede pagar de más.`,
        );
      }

      const [newPayment] = await tx
        .insert(orderPayment)
        .values({
          organizationId: activeOrganizationId,
          orderId: data.orderId,
          method: data.method,
          amount: data.amount,
          reference: data.reference || null,
          notes: data.notes || null,
          paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        })
        .returning();

      return newPayment;
    });

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
    const [deleted] = await db
      .delete(orderPayment)
      .where(
        and(eq(orderPayment.id, data.id), eq(orderPayment.organizationId, activeOrganizationId)),
      )
      .returning({ image: orderPayment.image });

    if (!deleted) throw new Error("Pago no encontrado");

    if (deleted.image) {
      await removeItemSafe(deleted.image);
    }

    return { success: true };
  });
