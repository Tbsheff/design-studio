// @generated
import type { PublishError } from "../../publish/errors/index.js";
import type { CoreError } from "./index.js";

type StudioError = CoreError | PublishError;

type StudioErrorTag = StudioError["_tag"];

export type { StudioError, StudioErrorTag };
