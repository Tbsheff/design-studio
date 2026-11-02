// @generated
import { BadRequest } from "./bad-request.js";
import { Conflict } from "./conflict.js";
import { Forbidden } from "./forbidden.js";
import { NotFound } from "./not-found.js";
import { NotImplemented } from "./not-implemented.js";
import { PickApp } from "./pick-app.js";

const CoreErrors = [
  BadRequest,
  Conflict,
  Forbidden,
  NotFound,
  NotImplemented,
  PickApp,
] as const;

type CoreError = InstanceType<(typeof CoreErrors)[number]>;

type CoreErrorTag = CoreError["_tag"];

export { CoreErrors };

export type { CoreError, CoreErrorTag };
