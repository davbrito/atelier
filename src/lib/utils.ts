export { cn } from "cnfast";

/**
 * Resolves an image source that may be a storage key or a full URL.
 *
 * - If `src` starts with a known storage prefix (`avatars/`, `uploads/`),
 *   returns a proxied URL via `/api/images?key=...`.
 * - Otherwise returns the value as-is (external URL, data URI, etc.).
 */
export function resolveImageSrc(src: string | null | undefined): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("avatars/") || src.startsWith("uploads/")) {
    return `/api/images?key=${encodeURIComponent(src)}`;
  }
  return src;
}
