// @generated

const BlockErrors = [] as const;

type BlockError = InstanceType<(typeof BlockErrors)[number]>;

type BlockErrorTag = BlockError["_tag"];

export { BlockErrors };

export type { BlockError, BlockErrorTag };
