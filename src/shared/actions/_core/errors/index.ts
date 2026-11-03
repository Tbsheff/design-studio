// @generated
import { BadRequest } from "./bad-request.js";
import { Conflict } from "./conflict.js";
import { DirectEditCode } from "./direct-edit-code.js";
import { DirectEditError } from "./direct-edit-error.js";
import { Forbidden } from "./forbidden.js";
import { Gone } from "./gone.js";
import { NotFound } from "./not-found.js";
import { NotImplemented } from "./not-implemented.js";
import { PickApp } from "./pick-app.js";
import { RateLimited } from "./rate-limited.js";
import { Unauthenticated } from "./unauthenticated.js";
import { Unavailable } from "./unavailable.js";

const CoreErrors = [
  BadRequest,
  Conflict,
  DirectEditCode,
  DirectEditError,
  Forbidden,
  Gone,
  NotFound,
  NotImplemented,
  PickApp,
  RateLimited,
  Unauthenticated,
  Unavailable,
] as const;

type CoreError = InstanceType<(typeof CoreErrors)[number]>;

type CoreErrorTag = CoreError["_tag"];

export { CoreErrors };

export type { CoreError, CoreErrorTag };
