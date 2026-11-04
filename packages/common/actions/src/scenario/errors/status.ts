import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ScenarioErrorTag } from "./index.js";

const ScenarioStatus = {} as const satisfies Record<
  ScenarioErrorTag,
  HttpStatus
>;

export { ScenarioStatus };
