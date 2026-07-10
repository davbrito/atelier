import { createMiddleware } from "@tanstack/react-start";
import { AwsClient } from "aws4fetch";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export type EntityType = "materials" | "budgets";

export type PresignedResult = {
  error?: false;
  /** Pre-signed upload URL — the client PUTs the file directly here. */
  uploadUrl: string;
  /** The S3 key. For entity-scoped uploads this is deterministic. */
  key: string;
};

export type PresignedError = {
  error: true;
  code: "CONFIG_ERROR" | "VALIDATION_ERROR";
  message: string;
};

/** Thrown by moveObject when the source object does not exist (e.g. the client's upload PUT failed). */
export class MoveObjectSourceNotFoundError extends Error {
  constructor(public readonly sourceKey: string) {
    super(`Source object not found: ${sourceKey}`);
    this.name = "MoveObjectSourceNotFoundError";
  }
}

// ── Storage middleware (R2 binding) ──────────────────────
//
// All object keys here are literal R2 keys with `/` separators — the same
// convention used by the presigned PUT URLs and the `/uploads/$` serving
// route. Do NOT route these operations through unstorage: it normalizes
// keys (`/` → `:`), so objects written by the presigned upload would never
// be found and objects it writes would never be served.

export const storageMiddleware = createMiddleware().server(async ({ next, context }) => {
  const { env } = context;
  const bucket = env.STORAGE;
  return next({
    context: { moveObject, moveObjectSafe, putObject, removeItemSafe, createEntityPresignedUrl },
  });

  /**
   * Moves an object from sourceKey to destKey within the same bucket
   * (read → write → delete), preserving the stored Content-Type.
   *
   * The final delete of sourceKey is best-effort (via removeItemSafe): once
   * the object has been written to destKey, the move has already succeeded —
   * failing to clean up the leftover source object must not undo that.
   */
  async function moveObject(sourceKey: string, destKey: string): Promise<void> {
    const object = await bucket.get(sourceKey);
    if (!object) {
      throw new MoveObjectSourceNotFoundError(sourceKey);
    }
    // Defense in depth: the presigned URL already signs Content-Length, but
    // an object exceeding the limit must never be promoted to permanent
    // storage even if that check was somehow bypassed.
    if (object.size > MAX_IMAGE_SIZE) {
      await removeItemSafe(sourceKey);
      throw new Error(`Source object "${sourceKey}" exceeds max size: ${object.size} bytes`);
    }
    await bucket.put(destKey, object.body, {
      httpMetadata: object.httpMetadata ?? { contentType: contentTypeFromKey(destKey) },
    });
    await removeItemSafe(sourceKey);
  }

  /** Writes a file to the bucket with its Content-Type. */
  async function putObject(key: string, file: File): Promise<void> {
    await bucket.put(key, file, {
      httpMetadata: { contentType: file.type || contentTypeFromKey(key) },
    });
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
      await bucket.delete(key);
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
    contentLength: number,
  ): Promise<PresignedResult | PresignedError> {
    if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return {
        error: true,
        code: "VALIDATION_ERROR",
        message: `Invalid content type: ${contentType}`,
      };
    }

    if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > MAX_IMAGE_SIZE) {
      return {
        error: true,
        code: "VALIDATION_ERROR",
        message: "El archivo supera los 5 MB",
      };
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
    const key = `uploads/tmp/${entityType}/${entityId}.${ext}`;

    const url = `${env.STORAGE_URL}/${env.STORAGE_BUCKET}/${key}?X-Amz-Expires=300`;

    const uploadUrl = (
      await s3.sign(url, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          // Signed into the URL so R2 rejects a PUT of any other size —
          // without this an entity presigned URL had no upload size limit.
          "Content-Length": String(contentLength),
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
