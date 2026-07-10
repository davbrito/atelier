import type { AvatarConfig } from "@better-auth-ui/core";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { authenticatedMiddleware } from "#/lib/auth/functions";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, storageMiddleware } from "./storage";

export const AVATAR_SIZE = 256;
export const AVATAR_EXTENSION = "jpg";

function avatarKey(userId: string): string {
  return `uploads/avatars/${userId}.jpg`;
}

export const uploadAvatarFn = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware, storageMiddleware])
  .validator(z.instanceof(File))
  .handler(async ({ data: file, context: { user, putObject } }) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw new Error("Tipo de archivo no permitido");
    }
    if (file.size > MAX_IMAGE_SIZE) throw new Error("El archivo supera los 5 MB");

    const key = avatarKey(user.id);
    await putObject(key, file);
    return { key, url: `/${key}` };
  });

export const deleteAvatarFn = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware, storageMiddleware])
  .handler(async ({ context: { user, removeItemSafe } }) => {
    const image = user.image;
    // Only delete if it's a storage URL we own, not an external URL (e.g. Google)
    if (image?.startsWith("/uploads/avatars/")) {
      await removeItemSafe(image.slice(1)); // strip leading slash to get the storage key
    }
  });

// Client-side wrappers called by Better Auth UI's avatar config
async function uploadAvatar(file: File): Promise<string> {
  const result = await uploadAvatarFn({ data: file });
  return result.url;
}

async function deleteAvatar(_key: string): Promise<void> {
  await deleteAvatarFn({ data: undefined });
}

export const avatarConfig: Partial<AvatarConfig> = {
  upload: uploadAvatar,
  delete: deleteAvatar,
  size: AVATAR_SIZE,
  extension: AVATAR_EXTENSION,
};
