import { and, asc, count, eq, ilike } from "drizzle-orm";
import type { Db } from "#/db/client";
import * as schema from "#/db/schema";

export type ListClientsInput = { page: number; pageSize: number; search?: string };

export async function listClients(db: Db, organizationId: string, params: ListClientsInput) {
  const whereClause = and(
    eq(schema.client.organizationId, organizationId),
    params.search ? ilike(schema.client.name, `%${params.search}%`) : undefined,
  );

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(schema.client)
      .where(whereClause)
      .orderBy(asc(schema.client.name))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: count() }).from(schema.client).where(whereClause),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}

export async function getClientById(db: Db, organizationId: string, id: string) {
  const [client] = await db
    .select()
    .from(schema.client)
    .where(and(eq(schema.client.id, id), eq(schema.client.organizationId, organizationId)));

  if (!client) throw new Error("Cliente no encontrado");

  const measurements = await db
    .select()
    .from(schema.clientMeasurement)
    .where(eq(schema.clientMeasurement.clientId, client.id));

  return { ...client, measurements };
}

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

export type SetClientMeasurementInput = {
  clientId: string;
  /** Medida existente; sin id se crea una nueva. */
  measurementId?: string;
  name: string;
  /** null o 0 elimina la medida. */
  value: number | null;
};

/** Crea, actualiza o elimina una sola medida del cliente sin reenviar la ficha completa. */
export async function setClientMeasurement(
  tx: Db,
  organizationId: string,
  input: SetClientMeasurementInput,
) {
  const [existingClient] = await tx
    .select({ id: schema.client.id })
    .from(schema.client)
    .where(
      and(eq(schema.client.id, input.clientId), eq(schema.client.organizationId, organizationId)),
    );

  if (!existingClient) throw new Error("Cliente no encontrado");

  const ofClient = (measurementId: string) =>
    and(
      eq(schema.clientMeasurement.id, measurementId),
      eq(schema.clientMeasurement.clientId, input.clientId),
    );
  const shouldDelete = input.value === null || input.value === 0;

  let measurement: typeof schema.clientMeasurement.$inferSelect | null = null;
  if (input.measurementId) {
    if (shouldDelete) {
      await tx.delete(schema.clientMeasurement).where(ofClient(input.measurementId));
    } else {
      [measurement] = await tx
        .update(schema.clientMeasurement)
        .set({ value: input.value ?? 0 })
        .where(ofClient(input.measurementId))
        .returning();
      if (!measurement) throw new Error("Medida no encontrada");
    }
  } else if (!shouldDelete) {
    [measurement] = await tx
      .insert(schema.clientMeasurement)
      .values({ clientId: input.clientId, name: input.name, value: input.value ?? 0 })
      .returning();
  }

  // La fecha de la ficha de taller es la de la última modificación del cliente.
  await tx
    .update(schema.client)
    .set({ updatedAt: new Date() })
    .where(eq(schema.client.id, input.clientId));

  return measurement;
}
