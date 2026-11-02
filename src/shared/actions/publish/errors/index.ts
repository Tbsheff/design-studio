// @generated
import { CfFailed } from "./cf-failed.js";

const PublishErrors = [CfFailed] as const;

type PublishError = InstanceType<(typeof PublishErrors)[number]>;

type PublishErrorTag = PublishError["_tag"];

export { PublishErrors };

export type { PublishError, PublishErrorTag };
