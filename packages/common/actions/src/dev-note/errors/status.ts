import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { DevNoteErrorTag } from "./index.js";

const DevNoteStatus = {} as const satisfies Record<DevNoteErrorTag, HttpStatus>;

export { DevNoteStatus };
