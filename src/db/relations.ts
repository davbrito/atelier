import { defineRelations } from "drizzle-orm";
import { authRelations } from "./auth.gen";
import * as schema from "./schema";

export const relations = {
  ...defineRelations(schema, (r) => ({
    whitelistEmail: {
      addedBy: r.one.user({
        from: r.whitelistEmail.addedById,
        to: r.user.id,
      }),
    },
    organization: {
      materials: r.many.material({
        from: r.organization.id,
        to: r.material.organizationId,
      }),
      operations: r.many.operation({
        from: r.organization.id,
        to: r.operation.organizationId,
      }),
      budgets: r.many.budget({
        from: r.organization.id,
        to: r.budget.organizationId,
      }),
      quotations: r.many.quotation({
        from: r.organization.id,
        to: r.quotation.organizationId,
      }),
      clients: r.many.client({
        from: r.organization.id,
        to: r.client.organizationId,
      }),
    },
    materials: {
      organization: r.one.organization({
        from: r.material.organizationId,
        to: r.organization.id,
      }),
      inventoryMovements: r.many.materialInventoryMovement({
        from: r.material.id,
        to: r.materialInventoryMovement.materialId,
      }),
    },
    materialInventoryMovements: {
      material: r.one.material({
        from: r.materialInventoryMovement.materialId,
        to: r.material.id,
      }),
      createdBy: r.one.user({
        from: r.materialInventoryMovement.createdById,
        to: r.user.id,
      }),
    },
    operations: {
      organization: r.one.organization({
        from: r.operation.organizationId,
        to: r.organization.id,
      }),
    },
    budgets: {
      organization: r.one.organization({
        from: r.budget.organizationId,
        to: r.organization.id,
      }),
      materials: r.many.material({
        from: r.budget.id.through(r.budgetMaterial.budgetId),
        to: r.material.id.through(r.budgetMaterial.materialId),
      }),
      operations: r.many.operation({
        from: r.budget.id.through(r.budgetOperation.budgetId),
        to: r.operation.id.through(r.budgetOperation.operationId),
      }),
    },
    quotations: {
      organization: r.one.organization({
        from: r.quotation.organizationId,
        to: r.organization.id,
      }),
      client: r.one.client({
        from: r.quotation.clientId,
        to: r.client.id,
      }),
    },
    clients: {
      organization: r.one.organization({
        from: r.client.organizationId,
        to: r.organization.id,
      }),
      measurements: r.many.clientMeasurement({
        from: r.client.id,
        to: r.clientMeasurement.clientId,
      }),
      quotations: r.many.quotation({
        from: r.client.id,
        to: r.quotation.clientId,
      }),
    },
  })),
  ...authRelations,
};
