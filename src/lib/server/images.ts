import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { budget, material } from "#/db/schema";
import { moveObject } from "#/lib/storage";
import { authenticatedMiddleware } from "../auth/functions";

const entityTypesTableMap = {
  budgets: budget,
  materials: material,
};

/**
 * After a client uploads an image directly to S3 via a pre-signed URL,
 * call this to commit the image:
 * 1. Move the file from `uploads/tmp/` to `uploads/` (permanent) via unstorage
 * 2. Persist the permanent key on the entity.
 */
export const setEntityImage = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(
    z.object({
      entityType: z.enum(["materials", "budgets"]),
      entityId: z.string(),
      imageKey: z.string(),
    }),
  )
  .handler(async ({ data, context: { db } }) => {
    const table = entityTypesTableMap[data.entityType];

    // Derive the permanent key from the temp key
    const permanentKey = data.imageKey.replace("/tmp/", "/");

    // Move the object from temp to permanent in the bucket via unstorage.
    // If this fails, do not update the DB so we don't point at a missing object.
    await moveObject(data.imageKey, permanentKey);

    // Persist the permanent key in the database only after the object exists there.
    await db.update(table).set({ image: permanentKey }).where(eq(table.id, data.entityId));

    return { success: true, permanentKey };
  });

export async function uploadEntityImage({
  signedUrl,
  entityType,
  entityId,
  file,
  key,
}: {
  signedUrl: string;
  entityType: "materials" | "budgets";
  entityId: string;
  file: File;
  key: string;
}) {
  await fetch(signedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  const commit = await setEntityImage({
    data: { entityType, entityId, imageKey: key },
  });

  if (!commit.success) {
    throw new Error("Failed to save image");
  }

  return commit.permanentKey;
}
