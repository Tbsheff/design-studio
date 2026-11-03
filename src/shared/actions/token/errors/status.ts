import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { TokenErrorTag } from "./index.js";

const TokenStatus = {} as const satisfies Record<TokenErrorTag, HttpStatus>;

export { TokenStatus };
