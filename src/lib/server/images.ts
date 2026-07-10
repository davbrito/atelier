import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { budget, material } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { MoveObjectSourceNotFoundError, storageMiddleware } from "../storage";

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
  .middleware([organizationMiddleware])
  .validator(
    z.object({
      entityType: z.enum(["materials", "budgets"]),
      entityId: z.uuid(),
      imageKey: z.string(),
    }),
  )
  .middleware([storageMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db, moveObject } }) => {
    const table = entityTypesTableMap[data.entityType];

    // The key must match what createEntityPresignedUrl generates for this
    // exact entity — never move arbitrary objects around the bucket.
    const expectedPrefix = `uploads/tmp/${data.entityType}/${data.entityId}.`;
    const ext = data.imageKey.slice(expectedPrefix.length);
    if (!data.imageKey.startsWith(expectedPrefix) || !/^[a-z0-9]+$/.test(ext)) {
      throw new Error("Clave de imagen inválida");
    }

    // The entity must belong to the active organization.
    const [entity] = await db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.id, data.entityId), eq(table.organizationId, activeOrganizationId)));
    if (!entity) {
      throw new Error("Entidad no encontrada");
    }

    const permanentKey = `uploads/${data.entityType}/${data.entityId}.${ext}`;

    // Move the object from temp to permanent in the bucket via unstorage.
    // If this fails, do not update the DB so we don't point at a missing object.
    try {
      await moveObject(data.imageKey, permanentKey);
    } catch (err) {
      if (err instanceof MoveObjectSourceNotFoundError) {
        throw new Error("La imagen no se subió correctamente, vuelve a intentarlo");
      }
      throw err;
    }

    // Persist the permanent key in the database only after the object exists there.
    await db
      .update(table)
      .set({ image: permanentKey })
      .where(and(eq(table.id, data.entityId), eq(table.organizationId, activeOrganizationId)));

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
  const uploadResponse = await fetch(signedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload image");
  }

  const commit = await setEntityImage({
    data: { entityType, entityId, imageKey: key },
  });

  if (!commit.success) {
    throw new Error("Failed to save image");
  }

  return commit.permanentKey;
}
