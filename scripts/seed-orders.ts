import "dotenv/config";
import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { relations } from "#/db/relations";
import { client, garment, garmentStage, order } from "#/db/schema";
import { DEFAULT_GARMENT_STAGES } from "#/lib/constants/garment-stages";
import { generateSequentialCode } from "#/lib/server/codes";

// Unlike the app runtime (Cloudflare Workers via Hyperdrive), a plain Node
// script must explicitly connect the pg Client before issuing queries.
async function connectDb(connectionString: string) {
  const pgClient = new Client({ connectionString });
  await pgClient.connect();
  return { db: drizzle({ client: pgClient, relations }), pgClient };
}

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

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["pending", "in_progress", "ready", "delivered", "cancelled"] as const;

async function nextOrderCode(
  db: Awaited<ReturnType<typeof connectDb>>["db"],
  organizationId: string,
) {
  const now = new Date();
  const prefix = `PED${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  return generateSequentialCode(db, organizationId, prefix);
}

async function main() {
  const organizationId = process.argv[2];
  if (!organizationId) {
    console.error("Uso: pnpm db:seed:orders <organizationId>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    console.error("DATABASE_URL_UNPOOLED no está definido");
    process.exit(1);
  }

  const { db, pgClient } = await connectDb(connectionString);

  // 1. Ensure garment stages exist.
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
          isFinalStage: stage.isFinalStage,
          isSystemDefault: true,
          position,
        })),
      )
      .returning();
  }

  // 2. Ensure a handful of clients exist.
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

  // 3. Create orders + garments.
  const orderCount = faker.number.int({ min: 8, max: 12 });
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
      Array.from({ length: garmentCount }, () => ({
        orderId: newOrder.id,
        name: faker.helpers.arrayElement(GARMENT_NAMES),
        stageId: faker.helpers.arrayElement(stages).id,
        quantity: 1,
        unitPrice: faker.commerce.price({ min: 20, max: 300 }),
        notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      })),
    );
  }

  console.log("Listo.");
  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
