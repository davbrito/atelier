import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "#/db/client";
import { order, orderPayment } from "#/db/schema";
import type { PAYMENT_TYPE_CODES } from "#/lib/constants/payment-types";
import { storageUrl } from "#/lib/utils";

export async function listOrderPayments(db: Db, organizationId: string, orderId: string) {
  const rows = await db
    .select()
    .from(orderPayment)
    .where(and(eq(orderPayment.orderId, orderId), eq(orderPayment.organizationId, organizationId)))
    .orderBy(desc(orderPayment.paidAt));

  return rows.map((p) => ({ ...p, image: p.image && storageUrl(p.image) }));
}

export type CreateOrderPaymentInput = {
  orderId: string;
  method: (typeof PAYMENT_TYPE_CODES)[number];
  amount: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
};

/**
 * Inserts a payment against an order, guarding against overpayment. Must run
 * inside a transaction: locks the order row (`FOR UPDATE`) before checking
 * the balance so two concurrent payments can't both pass the check and
 * jointly overpay the order.
 */
export async function createOrderPayment(
  tx: Db,
  organizationId: string,
  data: CreateOrderPaymentInput,
) {
  const [owningOrder] = await tx
    .select({ totalAmount: order.totalAmount })
    .from(order)
    .where(and(eq(order.id, data.orderId), eq(order.organizationId, organizationId)))
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
      organizationId,
      orderId: data.orderId,
      method: data.method,
      amount: data.amount,
      reference: data.reference || null,
      notes: data.notes || null,
      paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
    })
    .returning();

  return newPayment;
}

export async function deleteOrderPayment(db: Db, organizationId: string, id: string) {
  const [deleted] = await db
    .delete(orderPayment)
    .where(and(eq(orderPayment.id, id), eq(orderPayment.organizationId, organizationId)))
    .returning({ image: orderPayment.image });

  if (!deleted) throw new Error("Pago no encontrado");

  return deleted;
}
