import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ContentErrorTag } from "./index.js";

const ContentStatus = {} as const satisfies Record<ContentErrorTag, HttpStatus>;

export { ContentStatus };
