import slugify from "@sindresorhus/slugify";
import { generateRandomString } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import * as schema from "#/db/schema";

export type BudgetLineInput = { materialId: string; quantity: string };
export type BudgetOperationInput = { operationId: string; durationMinutes: number };

export type CreateBudgetInput = {
  name: string;
  description?: string;
  hourlyRate: string;
  materials: BudgetLineInput[];
  operations: BudgetOperationInput[];
};

async function uniqueSlug(tx: Db, name: string, keepSlug?: string): Promise<string> {
  const nameSlug = slugify(name);
  let slug = nameSlug;
  while (
    slug !== keepSlug &&
    (await tx.$count(tx.select().from(schema.budget).where(eq(schema.budget.slug, slug)).limit(1)))
  ) {
    slug = `${nameSlug}_${generateRandomString(4)}`;
  }
  return slug;
}

export async function createBudget(tx: Db, organizationId: string, data: CreateBudgetInput) {
  const slug = await uniqueSlug(tx, data.name);

  const [budget] = await tx
    .insert(schema.budget)
    .values({
      organizationId,
      slug,
      name: data.name,
      description: data.description ?? null,
      hourlyRate: data.hourlyRate,
    })
    .returning();

  if (data.materials.length > 0) {
    await tx.insert(schema.budgetMaterial).values(
      data.materials.map((m) => ({
        budgetId: budget.id,
        materialId: m.materialId,
        quantity: m.quantity,
      })),
    );
  }

  if (data.operations.length > 0) {
    await tx.insert(schema.budgetOperation).values(
      data.operations.map((o) => ({
        budgetId: budget.id,
        operationId: o.operationId,
        durationMinutes: o.durationMinutes,
      })),
    );
  }

  return budget;
}

export type UpdateBudgetInput = CreateBudgetInput & { deleteImage?: boolean };

export async function updateBudget(
  tx: Db,
  organizationId: string,
  id: string,
  data: UpdateBudgetInput,
) {
  const [existing] = await tx
    .select({ image: schema.budget.image, slug: schema.budget.slug })
    .from(schema.budget)
    .where(and(eq(schema.budget.id, id), eq(schema.budget.organizationId, organizationId)));

  if (!existing) throw new Error("Presupuesto no encontrado");

  // Regenerate the slug from the (possibly new) name, dedup against other
  // budgets — the current one is allowed to keep its own slug. Without
  // this, renaming to a name that collides with another budget would break
  // with a UNIQUE constraint violation.
  const slug = await uniqueSlug(tx, data.name, existing.slug);

  await tx
    .update(schema.budget)
    .set({
      slug,
      name: data.name,
      description: data.description ?? null,
      hourlyRate: data.hourlyRate,
      image: data.deleteImage ? null : existing.image,
    })
    .where(and(eq(schema.budget.id, id), eq(schema.budget.organizationId, organizationId)));

  // Replace materials
  await tx.delete(schema.budgetMaterial).where(eq(schema.budgetMaterial.budgetId, id));
  if (data.materials.length > 0) {
    await tx.insert(schema.budgetMaterial).values(
      data.materials.map((m) => ({
        budgetId: id,
        materialId: m.materialId,
        quantity: m.quantity,
      })),
    );
  }

  // Replace operations
  await tx.delete(schema.budgetOperation).where(eq(schema.budgetOperation.budgetId, id));
  if (data.operations.length > 0) {
    await tx.insert(schema.budgetOperation).values(
      data.operations.map((o) => ({
        budgetId: id,
        operationId: o.operationId,
        durationMinutes: o.durationMinutes,
      })),
    );
  }

  const [row] = await tx.select().from(schema.budget).where(eq(schema.budget.id, id));
  return { updated: row, existingImage: existing.image };
}

export async function deleteBudget(db: Db, organizationId: string, id: string) {
  const [deleted] = await db
    .delete(schema.budget)
    .where(and(eq(schema.budget.id, id), eq(schema.budget.organizationId, organizationId)))
    .returning({ image: schema.budget.image });

  if (!deleted) throw new Error("Presupuesto no encontrado");

  return deleted;
}
