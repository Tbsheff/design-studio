// @generated
import { DirectEditConflict } from "./direct-edit-conflict.js";
import { DirectEditFailed } from "./direct-edit-failed.js";
import { DirectEditNotFound } from "./direct-edit-not-found.js";

const DirectEditErrors = [
  DirectEditConflict,
  DirectEditFailed,
  DirectEditNotFound,
] as const;

type DirectEditError = InstanceType<(typeof DirectEditErrors)[number]>;

type DirectEditErrorTag = DirectEditError["_tag"];

export { DirectEditErrors };

export type { DirectEditError, DirectEditErrorTag };
