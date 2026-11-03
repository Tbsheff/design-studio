// @generated
import { CommentStatus } from "../comment/errors/status.js";
import { ContentStatus } from "../content/errors/status.js";
import { DirectEditStatus } from "../direct-edit/errors/status.js";
import { ImageStatus } from "../image/errors/status.js";
import { PackStatus } from "../pack/errors/status.js";
import { PublishStatus } from "../publish/errors/status.js";
import { TokenStatus } from "../token/errors/status.js";
import { ViewportStatus } from "../viewport/errors/status.js";
import type { StudioErrorTag } from "./errors/all.js";
import type { HttpStatus } from "./errors/http-status-codes.js";
import { CoreStatus } from "./errors/status.js";

const HTTP_STATUS = {
  ...CoreStatus,
  ...CommentStatus,
  ...ContentStatus,
  ...DirectEditStatus,
  ...ImageStatus,
  ...PackStatus,
  ...PublishStatus,
  ...TokenStatus,
  ...ViewportStatus,
  Defect: 500,
} as const satisfies Record<StudioErrorTag | "Defect", HttpStatus>;

const statusOf = (tag: StudioErrorTag | "Defect"): HttpStatus =>
  HTTP_STATUS[tag];

export { HTTP_STATUS, statusOf };
