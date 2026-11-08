import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { FixtureErrorTag } from "./index.js";

const FixtureStatus = {} as const satisfies Record<FixtureErrorTag, HttpStatus>;

export { FixtureStatus };
