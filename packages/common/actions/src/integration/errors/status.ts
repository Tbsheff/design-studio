import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { IntegrationErrorTag } from "./index.js";

const IntegrationStatus = {} as const satisfies Record<
  IntegrationErrorTag,
  HttpStatus
>;

export { IntegrationStatus };
