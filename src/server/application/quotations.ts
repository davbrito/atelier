import { eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import * as schema from "#/db/schema";
import { generateSequentialCode } from "#/server/application/codes";

export async function loadQuotationLines(db: Db, quotationId: string) {
  const lines = await db
    .select({
      id: schema.quotationLine.id,
      quotationId: schema.quotationLine.quotationId,
      budgetId: schema.quotationLine.budgetId,
      createdAt: schema.quotationLine.createdAt,
      budgetName: schema.budget.name,
      budgetSlug: schema.budget.slug,
    })
    .from(schema.quotationLine)
    .leftJoin(schema.budget, eq(schema.quotationLine.budgetId, schema.budget.id))
    .where(eq(schema.quotationLine.quotationId, quotationId));

  const linesWithItems = await Promise.all(
    lines.map(async (line) => {
      const materials = await db.query.quotationMaterial.findMany({
        where: { quotationLineId: line.id },
        extras: {
          amount: (t, { sql }) => sql<string>`${t.quantity} * ${t.frozenPrice}`,
        },
      });

      const operations = await db.query.quotationOperation.findMany({
        where: { quotationLineId: line.id },
        extras: {
          amount: (t, { sql }) =>
            sql<string>`((${t.durationMinutes} / 60.0) * ${t.frozenHourlyRate})`,
        },
      });

      return { ...line, materials, operations };
    }),
  );

  return linesWithItems;
}

export type CreateQuotationInput = {
  budgetIds: string[];
  clientId: string;
};

/**
 * Creates a quotation with one line per selected budget, freezing each
 * budget's client name, materials, and operations at generation time so the
 * quote stays immutable even if the catalog changes afterward. Must run
 * inside a transaction.
 */
export async function createQuotation(tx: Db, organizationId: string, data: CreateQuotationInput) {
  const client = await tx.query.client.findFirst({
    where: { id: data.clientId, organizationId },
  });

  if (!client) throw new Error("Cliente no encontrado");

  const now = new Date();
  const prefix = `COT${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const slug = await generateSequentialCode(tx, organizationId, prefix);

  // Create the quotation header, freezing the client's name at
  // generation time so it stays immutable even if the client is renamed.
  const [quotation] = await tx
    .insert(schema.quotation)
    .values({
      organizationId,
      slug,
      clientId: client.id,
      clientTitle: client.name,
    })
    .returning();

  // One line per selected budget, each freezing its own materials and
  // operations (mirrors an order's multiple garments).
  for (const budgetId of data.budgetIds) {
    const budget = await tx.query.budget.findFirst({
      columns: { id: true, hourlyRate: true },
      where: { id: budgetId, organizationId },
    });

    if (!budget) throw new Error("Presupuesto no encontrado");

    const budgetMats = await tx
      .select()
      .from(schema.budgetMaterial)
      .where(eq(schema.budgetMaterial.budgetId, budgetId));

    const budgetOps = await tx
      .select()
      .from(schema.budgetOperation)
      .where(eq(schema.budgetOperation.budgetId, budgetId));

    const [line] = await tx
      .insert(schema.quotationLine)
      .values({ quotationId: quotation.id, budgetId })
      .returning();

    // Freeze materials with current name, price and unit. A budget line
    // pointing at a material that is gone from the catalog would produce
    // a wrong quote, so fail (and roll back) instead of freezing bad data.
    if (budgetMats.length > 0) {
      const catalogMats = await tx
        .select()
        .from(schema.material)
        .where(eq(schema.material.organizationId, organizationId));

      const materialMap = new Map(catalogMats.map((m) => [m.id, m]));

      await tx.insert(schema.quotationMaterial).values(
        budgetMats.map((bm) => {
          const catalog = materialMap.get(bm.materialId);
          if (!catalog) {
            throw new Error(
              "El presupuesto referencia un material que ya no existe en el catálogo. Edita el presupuesto antes de generar la cotización.",
            );
          }
          return {
            quotationLineId: line.id,
            materialId: bm.materialId,
            quantity: bm.quantity,
            frozenName: catalog.name,
            frozenPrice: catalog.currentPrice,
            frozenUnit: catalog.unit,
          };
        }),
      );
    }

    // Freeze operations with current name and hourly rate
    if (budgetOps.length > 0) {
      const catalogOps = await tx
        .select()
        .from(schema.operation)
        .where(eq(schema.operation.organizationId, organizationId));

      const operationMap = new Map(catalogOps.map((o) => [o.id, o]));

      await tx.insert(schema.quotationOperation).values(
        budgetOps.map((bo) => {
          const catalog = operationMap.get(bo.operationId);
          if (!catalog) {
            throw new Error(
              "El presupuesto referencia una operación que ya no existe en el catálogo. Edita el presupuesto antes de generar la cotización.",
            );
          }
          return {
            quotationLineId: line.id,
            operationId: bo.operationId,
            durationMinutes: bo.durationMinutes,
            frozenName: catalog.name,
            frozenHourlyRate: budget.hourlyRate,
          };
        }),
      );
    }
  }

  return quotation;
}
