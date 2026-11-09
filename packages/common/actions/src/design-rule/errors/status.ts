import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { DesignRuleErrorTag } from "./index.js";

const DesignRuleStatus = {} as const satisfies Record<
  DesignRuleErrorTag,
  HttpStatus
>;

export { DesignRuleStatus };
