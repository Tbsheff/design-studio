// @generated
import { RunInProgress } from "./run-in-progress.js";

const CommentsErrors = [RunInProgress] as const;

type CommentsError = InstanceType<(typeof CommentsErrors)[number]>;

type CommentsErrorTag = CommentsError["_tag"];

export { CommentsErrors };

export type { CommentsError, CommentsErrorTag };
