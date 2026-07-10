# Upload & Storage Audit (Cloudflare R2)

**Date:** 2026-07-10
**Scope:** `src/lib/storage.ts`, `src/lib/server/images.ts`, `src/routes/uploads/$.ts`,
`src/lib/server/image-access.ts`, `src/lib/avatar-upload.ts`, and the materials/budgets
server functions that consume the presigned-upload flow.

## 1. Overall Impression

The architecture is fundamentally sound — presigned PUT to a temp prefix, a server-side
commit (`setEntityImage`) that validates key ownership before moving to a permanent
location, and org-scoped read authorization on the serving route. However, the object
lifecycle has real gaps (orphaned R2 objects, one broken-reference path, a cache header
that silently breaks image replacement), and the presigned URL has no size limit, which
is an abuse vector.

## 2. Critical Issues

### C1. `Cache-Control: immutable` on mutable keys breaks image replacement
`src/routes/uploads/$.ts`

Keys are deterministic (`uploads/materials/{id}.{ext}`), so replacing an image reuses the
same URL. But the response is served with `public, max-age=31536000, immutable`, which
tells the browser to *never revalidate* for a year. The `If-None-Match`/304 logic the
route's comment relies on never runs, because the browser never re-requests. After a user
replaces an image (same extension), everyone keeps seeing the old one until a hard
reload.

Additionally, `public` on an authorization-gated response is dangerous: any shared cache
in front of the Worker could serve the image to users who fail `canAccessImage`.

**Fix:** `Cache-Control: private, no-cache` (browser caches the bytes but always
revalidates — a fresh image costs a 304, not a re-download), or move to versioned keys.

### C2. Replaced image with a different extension is orphaned and stays readable
`src/lib/server/images.ts` (`setEntityImage`)

`setEntityImage` updates the `image` column without reading the previous value. If a
material had `uploads/materials/{id}.png` and the new upload is `.webp`, the old `.png`
object is never deleted: it leaks storage forever and remains accessible to org members
via `canAccessImage` (which matches any extension).

**Fix:** select the entity's current `image` in the existing ownership check, and after
the DB update, `removeItemSafe(oldKey)` when it differs from `permanentKey`.

### C3. `updateBudget` deletes the old image *before* the new one is uploaded
`src/lib/server/budgets.ts`

When `imageContentType` is set (replace flow), the old object is deleted immediately, but
the DB still points to it (`image: existing.image`). The client's PUT +
`setEntityImage` commit happens *afterwards* and is explicitly allowed to fail softly.
If it fails, the budget references a deleted object → broken image (404) with no way
back. (`updateMaterial` has the opposite behavior — it doesn't delete on replace, which
causes C2 but not this.)

**Fix:** only delete on `deleteImage`; replace-cleanup belongs in `setEntityImage`
after the new object is committed (per C2).

### C4. Delete handlers remove the R2 object before the DB row
`src/lib/server/materials.ts` (`deleteMaterial`), `src/lib/server/budgets.ts`
(`deleteBudget`)

If the DB `delete` fails after `removeItemSafe` succeeded, the surviving entity points at
a deleted object. The pre-select + delete is also two round trips and racy.

**Fix:** invert the order — `DELETE ... RETURNING image`, then best-effort delete the
object. A DB failure leaves everything consistent; an R2 failure leaves only a harmless
orphan.

### C5. No size limit on presigned uploads
`src/lib/storage.ts` (`createEntityPresignedUrl`)

The avatar path enforces 5 MB, but the entity presigned URL signs only `Content-Type`.
Any org member can PUT a multi-gigabyte object into the bucket (storage cost, and
`moveObject` will then stream it through the Worker).

**Fix (two layers):** sign the `Content-Length` header into the presigned URL (client
sends `file.size` when requesting it; R2 rejects a PUT whose length doesn't match), and
verify `object.size` server-side in the commit path before moving, deleting oversized
temp objects.

### C6. Abandoned temp objects accumulate forever

If the user closes the tab after the PUT but before `setEntityImage` (or the commit fails
and is never retried), the object under `uploads/tmp/` is never cleaned. Nothing in the
repo configures cleanup.

**Fix:** add an R2 lifecycle rule expiring the `uploads/tmp/` prefix after ~1 day
(dashboard or `wrangler r2 bucket lifecycle add <bucket> --prefix uploads/tmp/ --expire-days 1`).
The presigned URL only lives 300 s, so 1 day is safely conservative. This also handles
"`moveObject` succeeded but the DB update threw" residue.

## 3. Suggestions for Improvement

- **Validate `imageContentType` at the schema** (`materials.ts`, `budgets.ts` accept any
  string). Today an invalid type is only rejected by `createEntityPresignedUrl` *after*
  the entity was already created/updated, so the client gets a thrown error for a save
  that actually succeeded. Use `z.enum(ALLOWED_IMAGE_TYPES)` and export the list from one
  place — it is currently duplicated in `storage.ts` and `avatar-upload.ts`.
- **Misleading error taxonomy:** an invalid content type returns `code: "CONFIG_ERROR"` —
  it's a validation error; the client can't distinguish "unsupported file type" from
  "server misconfigured".
- **`moveObject` streams the whole object through the Worker.** The R2 binding has no
  server-side copy, but R2's S3 API supports `CopyObject` (`x-amz-copy-source`) and the
  signed S3 client already exists. Minor for image-sized objects; worth doing if sizes
  grow.
- **`encodeURI(entityType)`** is dead weight (and `encodeURI` doesn't escape `/`);
  `entityType` is a typed enum literal and `entityId` is a DB-generated UUID — drop both
  encodings.
- **`canAccessImage` does two sequential queries**; a single `EXISTS` join of entity ×
  member halves latency on the hottest read path (every image request).
- **Avatar key vs. content type mismatch** (`avatar-upload.ts`): the key is always `.jpg`
  but `putObject` stores the real `file.type` (e.g. `image/png`). Works today because
  serving reads stored metadata, but it's a trap for anything that later trusts the
  extension (e.g. `contentTypeFromKey`). Either enforce JPEG or put the real extension in
  the key.
- **Redundant check:** `if (!(file instanceof File))` in `uploadAvatarFn` — the zod
  validator already guarantees it.
- **Avatars are readable by any authenticated user** (`image-access.ts`). Probably
  intentional; add a comment stating it's a product decision, since it reads like an
  oversight next to the org-scoped rules.
- The uploads route passes the raw `If-None-Match` header to R2's `etagDoesNotMatch`;
  weak (`W/"…"`) or multi-ETag values aren't handled. Fine for the common case, but a
  small parse would be more robust.

## 4. Implementation Proposal

Affected files: `src/lib/storage.ts`, `src/lib/server/images.ts`,
`src/routes/uploads/$.ts`, `src/lib/server/materials.ts`, `src/lib/server/budgets.ts`,
the three sheet components calling `uploadEntityImage` (must pass `file.size` when
requesting the presigned URL), and one R2 lifecycle rule.

### `src/lib/storage.ts` — shared constants, signed Content-Length (C5)

```ts
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
] as const;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB, same cap as avatars

async function createEntityPresignedUrl(
  entityType: EntityType,
  entityId: string,
  contentType: string,
  contentLength: number,                       // ← new, from file.size
): Promise<PresignedResult | PresignedError> {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType as never)) {
    return { error: true, code: "VALIDATION_ERROR", message: `Invalid content type: ${contentType}` };
  }
  if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > MAX_IMAGE_SIZE) {
    return { error: true, code: "VALIDATION_ERROR", message: "El archivo supera los 5 MB" };
  }
  // ...
  const key = `uploads/tmp/${entityType}/${entityId}.${ext}`; // entityId is a DB uuid, entityType a typed enum
  const url = `${env.STORAGE_URL}/${env.STORAGE_BUCKET}/${key}?X-Amz-Expires=300`;
  const uploadUrl = (
    await s3.sign(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(contentLength), // signed → R2 rejects a PUT of any other size
      },
      aws: { signQuery: true },
    })
  ).url.toString();
  return { uploadUrl, key };
}
```

### `src/lib/server/images.ts` — clean up the replaced permanent object (C2)

```ts
.handler(async ({ data, context: { activeOrganizationId, db, moveObjectSafe, removeItemSafe } }) => {
  // ... prefix/ext validation unchanged ...

  const [entity] = await db
    .select({ id: table.id, image: table.image })      // ← also read the current image
    .from(table)
    .where(and(eq(table.id, data.entityId), eq(table.organizationId, activeOrganizationId)));
  if (!entity) throw new Error("Entidad no encontrada");

  const permanentKey = `uploads/${data.entityType}/${data.entityId}.${ext}`;

  const moved = await moveObjectSafe(data.imageKey, permanentKey);
  if (!moved) {
    return { success: false as const, error: "La imagen no se subió correctamente, vuelve a intentarlo" };
  }

  await db.update(table)
    .set({ image: permanentKey })
    .where(and(eq(table.id, data.entityId), eq(table.organizationId, activeOrganizationId)));

  // The extension can change between uploads (png → webp); the old permanent
  // object would otherwise be orphaned in R2 yet remain readable.
  if (entity.image && entity.image !== permanentKey) {
    await removeItemSafe(entity.image);
  }

  return { success: true as const, permanentKey };
});
```

Optionally harden `moveObject` (belt-and-braces for C5): after `bucket.get(sourceKey)`,
reject and delete the source if `object.size > MAX_IMAGE_SIZE`.

### `src/routes/uploads/$.ts` — fix caching semantics (C1)

Replace both occurrences of the header:

```ts
// Deterministic keys mean a replaced image reuses the same URL, so the
// browser must revalidate. no-cache still caches the bytes — a fresh
// image costs a 304, not a re-download. `private` keeps shared caches
// from serving an authorization-gated response to other users.
headers.set("Cache-Control", "private, no-cache");
```

### `src/lib/server/budgets.ts` — stop deleting the old image on replace (C3)

```ts
// On replace, the old object is cleaned up by setEntityImage *after* the
// new upload is committed — deleting it here would break the reference if
// the client's upload never lands.
if (existing?.image && data.deleteImage) {
  await removeItemSafe(existing.image);
}
```

### Delete handlers — DB row first, object second (C4)

```ts
.handler(async ({ data: { id }, context: { activeOrganizationId, db, removeItemSafe } }) => {
  const [deleted] = await db
    .delete(material)
    .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)))
    .returning({ image: material.image });
  if (!deleted) throw new Error("Material no encontrado");

  // Best-effort after the row is gone: an R2 failure leaves only an
  // unreferenced object, never a broken reference.
  if (deleted.image) await removeItemSafe(deleted.image);
  return { success: true };
});
```

Both form schemas also change `imageContentType: z.string().optional()` →
`z.enum(ALLOWED_IMAGE_TYPES).optional()` and add
`imageSize: z.number().int().positive().max(MAX_IMAGE_SIZE).optional()`, forwarded to
`createEntityPresignedUrl`; the sheet components pass `file.size` alongside `file.type`.

### Infrastructure (C6)

```
wrangler r2 bucket lifecycle add <bucket> --prefix uploads/tmp/ --expire-days 1
```

## Priority order

C1 (users see stale images today) → C3/C2 (data loss / storage leak on the replace flow)
→ C5/C6 (abuse and cost) → C4 and the style items.
