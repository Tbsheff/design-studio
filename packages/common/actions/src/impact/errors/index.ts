// @generated

const ImpactErrors = [] as const;

type ImpactError = InstanceType<(typeof ImpactErrors)[number]>;

type ImpactErrorTag = ImpactError["_tag"];

export { ImpactErrors };

export type { ImpactError, ImpactErrorTag };
