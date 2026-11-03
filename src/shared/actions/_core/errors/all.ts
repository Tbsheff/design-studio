// @generated
import type { CommentError } from "../../comment/errors/index.js";
import type { DirectEditError } from "../../direct-edit/errors/index.js";
import type { PackError } from "../../pack/errors/index.js";
import type { PublishError } from "../../publish/errors/index.js";
import type { CoreError } from "./index.js";

type StudioError =
  | CoreError
  | CommentError
  | DirectEditError
  | PackError
  | PublishError;

type StudioErrorTag = StudioError["_tag"];

export type { StudioError, StudioErrorTag };
