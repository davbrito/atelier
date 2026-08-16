export async function handleAccessUpload(
  bucket: R2Bucket,
  key: string,
  etag: string | null | undefined,
) {
  let object: R2ObjectBody | R2Object | null;

  try {
    object = await bucket.get(key, {
      onlyIf: {
        etagDoesNotMatch: etag
          ?.replace(/^W\//, "") // Strip weak validator prefix if present
          .replace(/^"|"$/g, ""), // Strip quotes if present
      },
    });
  } catch (error) {
    console.error("Error fetching image from R2:", error);

    return Response.json({ error: "Failed to fetch image from storage" }, { status: 500 });
  }

  if (!object) return Response.json({ error: "Image not found" }, { status: 404 });

  // R2 signals a match by returning an object without a body.
  // Deterministic keys mean a replaced image reuses the same URL, so the
  // browser must eventually revalidate — but it can serve the cached bytes
  // for a while first instead of round-tripping on every single load.
  // `private` keeps shared/CDN caches (this response is authorization-gated
  // per user) from ever storing it.
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=3600, must-revalidate");
  headers.set("ETag", object.httpEtag);

  if (!("body" in object) || object.body === null) {
    return new Response(null, { status: 304, headers });
  }

  headers.set("Content-Length", object.size.toString());
  return new Response(object.body, { status: 200, headers });
}
