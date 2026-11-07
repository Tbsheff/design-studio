import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ThemeErrorTag } from "./index.js";

const ThemeStatus = {} as const satisfies Record<ThemeErrorTag, HttpStatus>;

export { ThemeStatus };
