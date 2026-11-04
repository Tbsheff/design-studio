// @generated
import { RunInProgress } from "./run-in-progress.js";

const CommentErrors = [RunInProgress] as const;

type CommentError = InstanceType<(typeof CommentErrors)[number]>;

type CommentErrorTag = CommentError["_tag"];

export { CommentErrors };

export type { CommentError, CommentErrorTag };
