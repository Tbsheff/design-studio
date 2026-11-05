import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ImageSearchErrorTag } from "./index.js";

const ImageSearchStatus = {} as const satisfies Record<
  ImageSearchErrorTag,
  HttpStatus
>;

export { ImageSearchStatus };
