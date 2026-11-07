// @generated

const EffectErrors = [] as const;

type EffectError = InstanceType<(typeof EffectErrors)[number]>;

type EffectErrorTag = EffectError["_tag"];

export { EffectErrors };

export type { EffectError, EffectErrorTag };
