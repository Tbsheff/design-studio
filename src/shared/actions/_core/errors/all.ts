// @generated
import type { CommentsError } from "../../comments/errors/index.js";
import type { PacksError } from "../../packs/errors/index.js";
import type { PublishError } from "../../publish/errors/index.js";
import type { CoreError } from "./index.js";

type StudioError = CoreError | CommentsError | PacksError | PublishError;

type StudioErrorTag = StudioError["_tag"];

export type { StudioError, StudioErrorTag };
