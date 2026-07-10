import { createMiddleware } from "@tanstack/react-start";
import { AwsClient } from "aws4fetch";
import { createStorage } from "unstorage";
import s3Driver from "unstorage/drivers/cloudflare-r2-binding";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export type EntityType = "materials" | "budgets";

export type PresignedResult = {
  error?: false;
  /** Pre-signed upload URL — the client PUTs the file directly here. */
  uploadUrl: string;
  /** The S3 key. For entity-scoped uploads this is deterministic. */
  key: string;
};

export type PresignedError = { error: true; code: "CONFIG_ERROR"; message: string };

/** Thrown by moveObject when the source object does not exist (e.g. the client's upload PUT failed). */
export class MoveObjectSourceNotFoundError extends Error {
  constructor(public readonly sourceKey: string) {
    super(`Source object not found: ${sourceKey}`);
    this.name = "MoveObjectSourceNotFoundError";
  }
}

// ── Unstorage instance ───────────────────────────────────

let _storage: ReturnType<typeof createStorage> | null = null;

export const storageMiddleware = createMiddleware().server(async ({ next, context }) => {
  const { env } = context;
  _storage ??= createStorage({ driver: s3Driver({ binding: env.STORAGE }) });
  const storage = _storage;
  return next({
    context: { storage, moveObject, moveObjectSafe, removeItemSafe, createEntityPresignedUrl },
  });

  /**
   * Moves an object from sourceKey to destKey within the same bucket
   * (read → write → delete) via unstorage.
   * Content-Type is inferred from the key extension on read,
   * so we do not need to preserve S3 metadata.
   *
   * The final delete of sourceKey is best-effort (via removeItemSafe): once
   * the object has been written to destKey, the move has already succeeded —
   * failing to clean up the leftover source object must not undo that.
   */
  async function moveObject(sourceKey: string, destKey: string): Promise<void> {
    const data = await storage.getItemRaw(sourceKey);
    if (data === null || data === undefined) {
      throw new MoveObjectSourceNotFoundError(sourceKey);
    }
    await storage.setItemRaw(destKey, data);
    await removeItemSafe(sourceKey);
  }

  /**
   * Best-effort version of moveObject: a missing/corrupt source object
   * (e.g. the client's upload PUT silently failed) must not block committing
   * the rest of the entity, so failures are logged and swallowed instead of
   * thrown. Returns whether the move actually happened.
   */
  async function moveObjectSafe(sourceKey: string, destKey: string): Promise<boolean> {
    try {
      await moveObject(sourceKey, destKey);
      return true;
    } catch (err) {
      console.warn(`Failed to move storage object "${sourceKey}" -> "${destKey}":`, err);
      return false;
    }
  }

  /**
   * Best-effort delete of an object no longer referenced by an entity
   * (e.g. the previous image after a replace/delete). A stale or corrupt
   * object here must never block the entity update/delete itself, so
   * failures are logged and swallowed instead of thrown.
   */
  async function removeItemSafe(key: string): Promise<void> {
    try {
      await storage.removeItem(key);
    } catch (err) {
      console.warn(`Failed to remove storage object "${key}":`, err);
    }
  }

  // ── Presigned URL ────────────────────────────────────────

  /**
   * Generates a pre-signed URL scoped to an existing entity.
   * The key is deterministic: `{entityType}/{entityId}.{ext}`.
   * Subsequent uploads overwrite the same object.
   */
  async function createEntityPresignedUrl(
    entityType: EntityType,
    entityId: string,
    contentType: string,
  ): Promise<PresignedResult | PresignedError> {
    if (!ALLOWED_TYPES.includes(contentType)) {
      return { error: true, code: "CONFIG_ERROR", message: `Invalid content type: ${contentType}` };
    }

    let s3: ReturnType<typeof getS3Client>;

    try {
      s3 = getS3Client(env);
    } catch (err) {
      return { error: true, code: "CONFIG_ERROR", message: (err as Error).message };
    }

    const ext = contentType.split("/")[1] ?? "jpg";
    // Uploads go to a temp prefix. When the entity is committed via setEntityImage,
    // the object is moved to the permanent location.
    const key = `uploads/tmp/${encodeURI(entityType)}/${encodeURIComponent(entityId)}.${encodeURIComponent(ext)}`;

    const url = `${env.STORAGE_URL}/${env.STORAGE_BUCKET}/${key}?X-Amz-Expires=300`;

    const uploadUrl = (
      await s3.sign(url, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        aws: {
          signQuery: true,
        },
      })
    ).url.toString();

    return { uploadUrl, key };
  }
});

// ── S3 client (kept only for presigned URLs) ─────────────

let _s3Client: AwsClient | null = null;

function getS3Client(env: Env) {
  _s3Client ??= new AwsClient({
    region: "auto",
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    service: "s3",
  });
  return _s3Client;
}

// ── Content-Type helpers ─────────────────────────────────

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/** Infer Content-Type from the file extension in the key. */
export function contentTypeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_CONTENT_TYPE[ext] ?? "application/octet-stream";
}
