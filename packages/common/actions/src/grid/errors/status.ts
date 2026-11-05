import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { GridErrorTag } from "./index.js";

const GridStatus = {} as const satisfies Record<GridErrorTag, HttpStatus>;

export { GridStatus };
