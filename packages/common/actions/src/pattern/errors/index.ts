// @generated

const PatternErrors = [] as const;

type PatternError = InstanceType<(typeof PatternErrors)[number]>;

type PatternErrorTag = PatternError["_tag"];

export { PatternErrors };

export type { PatternError, PatternErrorTag };
