// @generated
import { CheckFailed } from "./check-failed.js";
import { PackExists } from "./pack-exists.js";

const PackErrors = [CheckFailed, PackExists] as const;

type PackError = InstanceType<(typeof PackErrors)[number]>;

type PackErrorTag = PackError["_tag"];

export { PackErrors };

export type { PackError, PackErrorTag };
