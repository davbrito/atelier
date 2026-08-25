import type { Db } from "#/db/client";
import {
  budget,
  client,
  material,
  member,
  operation,
  order,
  organization,
  quotation,
  user,
} from "#/db/schema";

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function seedOrganization(
  db: Db,
  overrides?: Partial<typeof organization.$inferInsert>,
) {
  const id = overrides?.id ?? randomId("org");
  const [row] = await db
    .insert(organization)
    .values({
      id,
      name: "Test Organization",
      slug: id,
      createdAt: new Date(),
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedUser(db: Db, overrides?: Partial<typeof user.$inferInsert>) {
  const id = overrides?.id ?? randomId("user");
  const [row] = await db
    .insert(user)
    .values({
      id,
      name: "Test User",
      email: `${id}@example.com`,
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedMember(
  db: Db,
  organizationId: string,
  userId: string,
  overrides?: Partial<typeof member.$inferInsert>,
) {
  const [row] = await db
    .insert(member)
    .values({
      id: randomId("member"),
      organizationId,
      userId,
      role: "member",
      createdAt: new Date(),
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedClient(
  db: Db,
  organizationId: string,
  overrides?: Partial<typeof client.$inferInsert>,
) {
  const [row] = await db
    .insert(client)
    .values({
      organizationId,
      name: "Test Client",
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedMaterial(
  db: Db,
  organizationId: string,
  overrides?: Partial<typeof material.$inferInsert>,
) {
  const [row] = await db
    .insert(material)
    .values({
      organizationId,
      name: "Test Material",
      unit: "m",
      currentPrice: "10.00",
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedBudget(
  db: Db,
  organizationId: string,
  overrides?: Partial<typeof budget.$inferInsert>,
) {
  const [row] = await db
    .insert(budget)
    .values({
      organizationId,
      slug: overrides?.slug ?? randomId("budget"),
      name: "Test Budget",
      hourlyRate: "20.00",
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedQuotation(
  db: Db,
  organizationId: string,
  clientId: string,
  overrides?: Partial<typeof quotation.$inferInsert>,
) {
  const [row] = await db
    .insert(quotation)
    .values({
      organizationId,
      clientId,
      clientTitle: "Test Client",
      slug: overrides?.slug ?? randomId("quotation"),
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedOperation(
  db: Db,
  organizationId: string,
  overrides?: Partial<typeof operation.$inferInsert>,
) {
  const [row] = await db
    .insert(operation)
    .values({
      organizationId,
      name: "Test Operation",
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedOrder(
  db: Db,
  organizationId: string,
  overrides?: Partial<typeof order.$inferInsert>,
) {
  const [row] = await db
    .insert(order)
    .values({
      organizationId,
      code: overrides?.code ?? randomId("ORD"),
      ...overrides,
    })
    .returning();
  return row;
}
