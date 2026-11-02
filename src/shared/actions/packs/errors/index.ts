// @generated
import { CheckFailed } from "./check-failed.js";
import { PackExists } from "./pack-exists.js";

const PacksErrors = [CheckFailed, PackExists] as const;

type PacksError = InstanceType<(typeof PacksErrors)[number]>;

type PacksErrorTag = PacksError["_tag"];

export { PacksErrors };

export type { PacksError, PacksErrorTag };
