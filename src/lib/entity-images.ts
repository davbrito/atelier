import { budget, material, orderPayment } from "#/db/schema";

/** Tables that support an `image` column uploaded via the presigned R2 flow. */
export const entityTypesTableMap = {
  budgets: budget,
  materials: material,
  orderPayments: orderPayment,
};

export type EntityType = keyof typeof entityTypesTableMap;

export const ENTITY_TYPES = Object.keys(entityTypesTableMap) as [EntityType, ...EntityType[]];
