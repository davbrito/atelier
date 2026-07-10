import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { budget, material } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { storageMiddleware } from "../storage";

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
  .handler(async ({ data, context: { activeOrganizationId, db, moveObjectSafe } }) => {
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

    // Move the object from temp to permanent in the bucket via unstorage. If the
    // upload never actually landed (e.g. the client's PUT silently failed), this
    // must not block saving the rest of the entity — just skip the image update.
    const moved = await moveObjectSafe(data.imageKey, permanentKey);
    if (!moved) {
      return {
        success: false as const,
        error: "La imagen no se subió correctamente, vuelve a intentarlo",
      };
    }

    // Persist the permanent key in the database only after the object exists there.
    await db
      .update(table)
      .set({ image: permanentKey })
      .where(and(eq(table.id, data.entityId), eq(table.organizationId, activeOrganizationId)));

    return { success: true as const, permanentKey };
  });

/**
 * Uploads the file and commits it as the entity's image. A failure here
 * (the PUT itself, or the server-side move) must not be treated as a hard
 * error — the entity save already succeeded — so this resolves to `null`
 * instead of throwing, and callers should surface a soft warning to the user.
 */
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
}): Promise<string | null> {
  const uploadResponse = await fetch(signedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!uploadResponse.ok) {
    console.warn(`Image upload PUT failed for ${entityType}/${entityId}:`, uploadResponse.status);
    return null;
  }

  const commit = await setEntityImage({
    data: { entityType, entityId, imageKey: key },
  });

  if (!commit.success) {
    console.warn(`Failed to commit image for ${entityType}/${entityId}:`, commit.error);
    return null;
  }

  return commit.permanentKey;
}
