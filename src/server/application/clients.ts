import { and, eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import * as schema from "#/db/schema";

export type ClientMeasurementInput = { name: string; value: number };

export type CreateClientInput = {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  measurements: ClientMeasurementInput[];
};

export async function createClient(tx: Db, organizationId: string, data: CreateClientInput) {
  const [newClient] = await tx
    .insert(schema.client)
    .values({
      organizationId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
    })
    .returning();

  if (data.measurements.length > 0) {
    await tx.insert(schema.clientMeasurement).values(
      data.measurements.map((m) => ({
        clientId: newClient.id,
        name: m.name,
        value: m.value,
      })),
    );
  }

  return newClient;
}

export async function updateClient(
  tx: Db,
  organizationId: string,
  id: string,
  data: CreateClientInput,
) {
  const [existing] = await tx
    .select({ id: schema.client.id })
    .from(schema.client)
    .where(and(eq(schema.client.id, id), eq(schema.client.organizationId, organizationId)));

  if (!existing) throw new Error("Cliente no encontrado");

  await tx
    .update(schema.client)
    .set({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
    })
    .where(eq(schema.client.id, id));

  await tx.delete(schema.clientMeasurement).where(eq(schema.clientMeasurement.clientId, id));
  if (data.measurements.length > 0) {
    await tx.insert(schema.clientMeasurement).values(
      data.measurements.map((m) => ({
        clientId: id,
        name: m.name,
        value: m.value,
      })),
    );
  }

  const [updated] = await tx.select().from(schema.client).where(eq(schema.client.id, id));
  return updated;
}

export async function deleteClient(db: Db, organizationId: string, id: string) {
  const [existing] = await db
    .select({ id: schema.client.id })
    .from(schema.client)
    .where(and(eq(schema.client.id, id), eq(schema.client.organizationId, organizationId)));

  if (!existing) throw new Error("Cliente no encontrado");

  await db
    .delete(schema.client)
    .where(and(eq(schema.client.id, id), eq(schema.client.organizationId, organizationId)));
}
