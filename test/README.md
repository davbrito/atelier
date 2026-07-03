# Test Notes

Use the Drizzle mock driver when a test needs a typed database object without a real PostgreSQL connection.

Reference: [Drizzle mock driver](https://orm.drizzle.team/docs/goodies#mock-driver)

Example:

```ts
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle.mock();
```

For route, API, or integration tests, fetch the URL directly instead of mocking the driver.

Example:

```ts
const response = await fetch("http://localhost:3000/api/health");
```

For Cloudflare Workers unit and integration tests, use Vitest with `@cloudflare/vitest-pool-workers` and follow the Workers testing guide: [Write your first test](https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/).
