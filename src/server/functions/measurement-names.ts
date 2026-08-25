import { createServerFn } from "@tanstack/react-start";
import { organizationMiddleware } from "#/lib/auth/functions";
import { cacheMeasurementNames, readNames } from "../application/measurement-names";

export const listMeasurementNames = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, env } }) => {
    return readNames(env.KV, activeOrganizationId);
  });

export { cacheMeasurementNames };
