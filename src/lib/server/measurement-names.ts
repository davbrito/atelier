import { createServerFn } from "@tanstack/react-start";
import { organizationMiddleware } from "../auth/functions";
import { cacheMeasurementNames, readNames } from "./measurement-names-cache";

export const listMeasurementNames = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, env } }) => {
    return readNames(env.KV, activeOrganizationId);
  });

export { cacheMeasurementNames };
