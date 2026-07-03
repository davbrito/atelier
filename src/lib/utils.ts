export { cn } from "cnfast";

/**
 * Resolves an image source that may be a storage key or a full URL.
 *
 * - If `src` points at storage (`avatars/…` or `uploads/…`, with or without
 *   a leading slash), returns a proxied URL via `/api/images?key=…`.
 * - Otherwise returns the value as-is (external URL, data URI, etc.).
 */
export function resolveImageSrc(src: string | null | undefined): string | undefined {
  if (!src) return undefined;
  const key = src.startsWith("/") ? src.slice(1) : src;
  if (key.startsWith("avatars/") || key.startsWith("uploads/")) {
    return `/api/images?key=${encodeURIComponent(key)}`;
  }
  return src;
}
