import assert from "node:assert";
import events from "node:events";
import net from "node:net";
import util from "node:util";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  interface ProvidedContext {
    echoServerPort: number;
  }
}

export const POSTGRES_SSL_REQUEST_PACKET = Buffer.from([
  0x00, 0x00, 0x00, 0x08, 0x04, 0xd2, 0x16, 0x2f,
]);

async function setupPostgresEchoServer({ provide }: TestProject): Promise<AsyncDisposable> {
  // Start echo server on random port
  const server = net.createServer((socket) => {
    socket.on("data", (chunk) => {
      // on postgres ssl request packet respond with 'N' to indicate no SSL support
      if (POSTGRES_SSL_REQUEST_PACKET.equals(chunk as Buffer<ArrayBuffer>)) {
        socket.write("N");
      } else {
        socket.write(chunk);
      }
    });
  });
  const listeningPromise = events.once(server, "listening");
  server.listen(0, "127.0.0.1");
  await listeningPromise;

  // Get randomly assigned port and provide for config
  const address = server.address();
  assert(typeof address === "object" && address !== null);
  const port = address.port;
  provide("echoServerPort", port);
  console.log(`Started echo server on port ${port}`);

  return {
    async [Symbol.asyncDispose]() {
      // Stop echo server on teardown
      await util.promisify(server.close.bind(server))();
      console.log("Stopped echo server");
    },
  };
}

// Global setup runs inside Node.js, not `workerd`
export default async function (project: TestProject) {
  const stack = new AsyncDisposableStack();
  stack.use(await setupPostgresEchoServer(project));

  return async () => {
    await stack.disposeAsync();
  };
}
