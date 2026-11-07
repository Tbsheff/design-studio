import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { EffectErrorTag } from "./index.js";

const EffectStatus = {} as const satisfies Record<EffectErrorTag, HttpStatus>;

export { EffectStatus };
