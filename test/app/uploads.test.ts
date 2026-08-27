import { env } from "cloudflare:workers";
import { it } from "vitest";
import { handleAccessUpload } from "#/lib/uploads.ts";

it("bucket uploads and etags work", async ({ expect }) => {
  let response = await handleAccessUpload(env.STORAGE, "test.jpg", null);
  expect(response.status).toBe(404);

  const value = new TextEncoder().encode("value");
  await env.STORAGE.put("uploads/test.jpg", value);

  response = await handleAccessUpload(env.STORAGE, "uploads/test.jpg", null);
  expect(response.status).toBe(200);
  expect(await response.arrayBuffer()).toEqual(value.buffer);

  const etag = response.headers.get("ETag");
  expect(etag).toBeTruthy();

  response = await handleAccessUpload(env.STORAGE, "uploads/test.jpg", etag);
  expect(response.status).toBe(304);
  expect(response.body).toBeNull();
  expect(await response.arrayBuffer()).toEqual(new ArrayBuffer(0));
});
