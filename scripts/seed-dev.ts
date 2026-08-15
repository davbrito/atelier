import "dotenv/config";
import { faker } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import { Command } from "commander";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { relations } from "#/db/relations";
import {
  budget,
  budgetMaterial,
  budgetOperation,
  client,
  garment,
  garmentStage,
  material,
  operation,
  order,
  quotation,
  quotationLine,
  quotationMaterial,
  quotationOperation,
} from "#/db/schema";
import { DEFAULT_GARMENT_STAGES } from "#/lib/constants/garment-stages";
import { generateSequentialCode } from "#/lib/server/codes";

// Unlike the app runtime (Cloudflare Workers via Hyperdrive), a plain Node
// script must explicitly connect the pg Client before issuing queries.
async function connectDb(connectionString: string) {
  const pgClient = new Client({ connectionString });
  await pgClient.connect();
  return { db: drizzle({ client: pgClient, relations }), pgClient };
}

type Db = Awaited<ReturnType<typeof connectDb>>["db"];

const GARMENT_NAMES = [
  "Vestido de novia",
  "Vestido de 15 años",
  "Traje de baño",
  "Conjunto sastre",
  "Corsé",
  "Falda plisada",
  "Blusa a medida",
  "Traje de gala",
  "Pantalón a medida",
  "Chaqueta entallada",
];

const MATERIAL_NAMES = [
  { name: "Tela Charmuse", unit: "metros" },
  { name: "Encaje francés", unit: "metros" },
  { name: "Hilo de coser", unit: "rollos" },
  { name: "Cierre invisible", unit: "unidades" },
  { name: "Entretela", unit: "metros" },
  { name: "Botones nacarados", unit: "unidades" },
];

const OPERATION_NAMES = [
  "Patrón base",
  "Corte de tela",
  "Costuras",
  "Bordado a mano",
  "Planchado final",
  "Colocación de cierre",
];

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["pending", "in_progress", "ready", "delivered", "cancelled"] as const;

async function nextOrderCode(db: Db, organizationId: string) {
  const now = new Date();
  const prefix = `PED${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  return generateSequentialCode(db, organizationId, prefix);
}

async function ensureGarmentStages(db: Db, organizationId: string) {
  let stages = await db
    .select()
    .from(garmentStage)
    .where(eq(garmentStage.organizationId, organizationId));

  if (stages.length === 0) {
    console.log("Creando etapas por defecto...");
    stages = await db
      .insert(garmentStage)
      .values(
        DEFAULT_GARMENT_STAGES.map((stage, position) => ({
          organizationId,
          name: stage.name,
          color: stage.color,
          isFinalStage: stage.isFinalStage,
          isSystemDefault: true,
          position,
        })),
      )
      .returning();
  }

  return stages;
}

async function ensureClients(db: Db, organizationId: string) {
  let clients = await db.select().from(client).where(eq(client.organizationId, organizationId));

  if (clients.length < 5) {
    console.log("Creando clientes de prueba...");
    const newClients = await db
      .insert(client)
      .values(
        Array.from({ length: 5 - clients.length }, () => ({
          organizationId,
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          email: faker.internet.email(),
        })),
      )
      .returning();
    clients = [...clients, ...newClients];
  }

  return clients;
}

async function ensureMaterials(db: Db, organizationId: string) {
  let materials = await db
    .select()
    .from(material)
    .where(eq(material.organizationId, organizationId));

  if (materials.length < MATERIAL_NAMES.length) {
    console.log("Creando materiales de prueba...");
    const newMaterials = await db
      .insert(material)
      .values(
        MATERIAL_NAMES.map((m) => ({
          organizationId,
          name: m.name,
          unit: m.unit,
          currentPrice: faker.commerce.price({ min: 1, max: 30 }),
        })),
      )
      .returning();
    materials = newMaterials;
  }

  return materials;
}

async function ensureOperations(db: Db, organizationId: string) {
  let operations = await db
    .select()
    .from(operation)
    .where(eq(operation.organizationId, organizationId));

  if (operations.length < OPERATION_NAMES.length) {
    console.log("Creando operaciones de prueba...");
    const newOperations = await db
      .insert(operation)
      .values(OPERATION_NAMES.map((name) => ({ organizationId, name })))
      .returning();
    operations = newOperations;
  }

  return operations;
}

async function ensureBudgets(
  db: Db,
  organizationId: string,
  materials: (typeof material.$inferSelect)[],
  operations: (typeof operation.$inferSelect)[],
) {
  const budgets = await db.select().from(budget).where(eq(budget.organizationId, organizationId));

  if (budgets.length < GARMENT_NAMES.length) {
    console.log("Creando presupuestos de prueba...");
    for (const name of GARMENT_NAMES) {
      const slug = `${slugify(name)}-${faker.string.alphanumeric(4).toLowerCase()}`;

      const [newBudget] = await db
        .insert(budget)
        .values({
          organizationId,
          slug,
          name,
          hourlyRate: faker.commerce.price({ min: 3, max: 8 }),
        })
        .returning();

      const budgetMats = faker.helpers.arrayElements(materials, { min: 1, max: 3 });
      await db.insert(budgetMaterial).values(
        budgetMats.map((m) => ({
          budgetId: newBudget.id,
          materialId: m.id,
          quantity: faker.commerce.price({ min: 0.5, max: 4, dec: 2 }),
        })),
      );

      const budgetOps = faker.helpers.arrayElements(operations, { min: 1, max: 3 });
      await db.insert(budgetOperation).values(
        budgetOps.map((o) => ({
          budgetId: newBudget.id,
          operationId: o.id,
          durationMinutes: faker.number.int({ min: 15, max: 180 }),
        })),
      );

      budgets.push(newBudget);
    }
  }

  return budgets;
}

async function ensureQuotations(
  db: Db,
  organizationId: string,
  clients: (typeof client.$inferSelect)[],
  budgets: (typeof budget.$inferSelect)[],
) {
  const existing = await db
    .select()
    .from(quotation)
    .where(eq(quotation.organizationId, organizationId));

  if (existing.length > 0) return;

  console.log("Creando cotizaciones de prueba...");

  const allBudgetMats = await db.select().from(budgetMaterial);
  const allBudgetOps = await db.select().from(budgetOperation);
  const materialCatalog = new Map((await db.select().from(material)).map((m) => [m.id, m]));
  const operationCatalog = new Map((await db.select().from(operation)).map((o) => [o.id, o]));

  for (let i = 0; i < 3; i++) {
    const pickedClient = faker.helpers.arrayElement(clients);
    const pickedBudgets = faker.helpers.arrayElements(budgets, { min: 1, max: 2 });
    const slug = `${slugify(pickedClient.name)}-${faker.string.alphanumeric(5).toLowerCase()}`;

    const [newQuotation] = await db
      .insert(quotation)
      .values({
        organizationId,
        slug,
        clientId: pickedClient.id,
        clientTitle: pickedClient.name,
      })
      .returning();

    for (const b of pickedBudgets) {
      const [line] = await db
        .insert(quotationLine)
        .values({ quotationId: newQuotation.id, budgetId: b.id })
        .returning();

      const mats = allBudgetMats.filter((bm) => bm.budgetId === b.id);
      if (mats.length > 0) {
        await db.insert(quotationMaterial).values(
          mats.flatMap((bm) => {
            const catalog = materialCatalog.get(bm.materialId);
            if (!catalog) return [];
            return [
              {
                quotationLineId: line.id,
                materialId: bm.materialId,
                quantity: bm.quantity,
                frozenName: catalog.name,
                frozenPrice: catalog.currentPrice,
                frozenUnit: catalog.unit,
              },
            ];
          }),
        );
      }

      const ops = allBudgetOps.filter((bo) => bo.budgetId === b.id);
      if (ops.length > 0) {
        await db.insert(quotationOperation).values(
          ops.flatMap((bo) => {
            const catalog = operationCatalog.get(bo.operationId);
            if (!catalog) return [];
            return [
              {
                quotationLineId: line.id,
                operationId: bo.operationId,
                durationMinutes: bo.durationMinutes,
                frozenName: catalog.name,
                frozenHourlyRate: b.hourlyRate,
              },
            ];
          }),
        );
      }
    }
  }
}

async function seedOrders(
  db: Db,
  organizationId: string,
  clients: (typeof client.$inferSelect)[],
  stages: (typeof garmentStage.$inferSelect)[],
  budgets: (typeof budget.$inferSelect)[],
  orderCount: number,
) {
  console.log(`Creando ${orderCount} pedidos...`);

  for (let i = 0; i < orderCount; i++) {
    const code = await nextOrderCode(db, organizationId);
    const pickedClient = faker.helpers.arrayElement(clients);

    const [newOrder] = await db
      .insert(order)
      .values({
        organizationId,
        clientId: pickedClient.id,
        code,
        status: faker.helpers.arrayElement(STATUSES),
        priority: faker.helpers.arrayElement(PRIORITIES),
        totalAmount: faker.commerce.price({ min: 50, max: 800 }),
        depositAmount: faker.commerce.price({ min: 0, max: 200 }),
        dueDate: faker.date.soon({ days: 45 }),
        notes: faker.lorem.sentence(),
      })
      .returning();

    const garmentCount = faker.number.int({ min: 1, max: 3 });
    await db.insert(garment).values(
      Array.from({ length: garmentCount }, () => {
        const pickedBudget =
          budgets.length > 0 && faker.datatype.boolean()
            ? faker.helpers.arrayElement(budgets)
            : undefined;

        return {
          orderId: newOrder.id,
          name: pickedBudget?.name ?? faker.helpers.arrayElement(GARMENT_NAMES),
          budgetId: pickedBudget?.id,
          stageId: faker.helpers.arrayElement(stages).id,
          quantity: 1,
          unitPrice: faker.commerce.price({ min: 20, max: 300 }),
          notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
        };
      }),
    );
  }
}

async function main() {
  const program = new Command();
  program
    .name("seed-dev")
    .description("Siembra datos de desarrollo (etapas, clientes, catálogo, cotizaciones, pedidos)")
    .argument("<organizationId>", "ID de la organización a sembrar")
    .option(
      "-n, --order-count <count>",
      "cantidad de pedidos a crear",
      (value) => Number.parseInt(value, 10),
    )
    .parse();

  const organizationId = program.args[0];
  const orderCount = program.opts().orderCount ?? faker.number.int({ min: 8, max: 12 });

  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    console.error("DATABASE_URL_UNPOOLED no está definido");
    process.exit(1);
  }

  const { db, pgClient } = await connectDb(connectionString);

  const stages = await ensureGarmentStages(db, organizationId);
  const clients = await ensureClients(db, organizationId);
  const materials = await ensureMaterials(db, organizationId);
  const operations = await ensureOperations(db, organizationId);
  const budgets = await ensureBudgets(db, organizationId, materials, operations);
  await ensureQuotations(db, organizationId, clients, budgets);
  await seedOrders(db, organizationId, clients, stages, budgets, orderCount);

  console.log("Listo.");
  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
