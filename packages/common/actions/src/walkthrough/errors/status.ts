import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { WalkthroughErrorTag } from "./index.js";

const WalkthroughStatus = {} as const satisfies Record<
  WalkthroughErrorTag,
  HttpStatus
>;

export { WalkthroughStatus };
