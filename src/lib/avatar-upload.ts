import type { AvatarConfig } from "@better-auth-ui/core";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { authenticatedMiddleware } from "#/lib/auth/functions";
import { storageMiddleware } from "./storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export const AVATAR_SIZE = 256;
export const AVATAR_EXTENSION = "jpg";

function avatarKey(userId: string): string {
  return `uploads/avatars/${userId}.jpg`;
}

export const uploadAvatarFn = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware, storageMiddleware])
  .validator(z.instanceof(File))
  .handler(async ({ data: file, context: { user, storage } }) => {
    if (!(file instanceof File)) throw new Error("No file provided");
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Tipo de archivo no permitido");
    if (file.size > MAX_SIZE) throw new Error("El archivo supera los 5 MB");

    const key = avatarKey(user.id);
    await storage.setItemRaw(key, file);
    return { key, url: `/${key}` };
  });

export const deleteAvatarFn = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware, storageMiddleware])
  .handler(async ({ context: { user, storage } }) => {
    const image = user.image;
    // Only delete if it's a storage URL we own, not an external URL (e.g. Google)
    if (image?.startsWith("/uploads/avatars/")) {
      await storage.removeItem(image.slice(1)); // strip leading slash to get the storage key
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
