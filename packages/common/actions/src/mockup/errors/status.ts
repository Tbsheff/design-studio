import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { MockupErrorTag } from "./index.js";

const MockupStatus = {} as const satisfies Record<MockupErrorTag, HttpStatus>;

export { MockupStatus };
