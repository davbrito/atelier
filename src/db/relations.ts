import { defineRelations } from "drizzle-orm";
import { authRelations } from "./auth.gen";
import * as schema from "./schema";

const atelierRelations = defineRelations(schema, (r) => ({
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
    garmentStages: r.many.garmentStage({
      from: r.organization.id,
      to: r.garmentStage.organizationId,
    }),
    orders: r.many.order({
      from: r.organization.id,
      to: r.order.organizationId,
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
  budgetMaterials: {
    budget: r.one.budget({
      from: r.budgetMaterial.budgetId,
      to: r.budget.id,
      optional: false,
    }),
    material: r.one.material({
      from: r.budgetMaterial.materialId,
      to: r.material.id,
      optional: false,
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
    orders: r.many.order({
      from: r.client.id,
      to: r.order.clientId,
    }),
  },
  garmentStages: {
    organization: r.one.organization({
      from: r.garmentStage.organizationId,
      to: r.organization.id,
    }),
  },
  orders: {
    organization: r.one.organization({
      from: r.order.organizationId,
      to: r.organization.id,
    }),
    client: r.one.client({
      from: r.order.clientId,
      to: r.client.id,
    }),
    quotation: r.one.quotation({
      from: r.order.quotationId,
      to: r.quotation.id,
    }),
    garments: r.many.garment({
      from: r.order.id,
      to: r.garment.orderId,
    }),
  },
  garments: {
    stage: r.one.garmentStage({
      from: r.garment.stageId,
      to: r.garmentStage.id,
    }),
    order: r.one.order({
      from: r.garment.orderId,
      to: r.order.id,
    }),
  },
}));

export const relations = {
  ...atelierRelations,
  ...authRelations,
} as const;
