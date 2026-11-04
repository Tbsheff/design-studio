// @generated

const TokenErrors = [] as const;

type TokenError = InstanceType<(typeof TokenErrors)[number]>;

type TokenErrorTag = TokenError["_tag"];

export { TokenErrors };

export type { TokenError, TokenErrorTag };
