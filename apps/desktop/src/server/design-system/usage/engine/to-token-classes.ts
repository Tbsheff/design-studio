import type { TokenUse, UsageIndex, UsageToken } from "./count-token-uses.js";

interface TokenClass {
  readonly className: string;
  readonly tokenName: string;
  readonly useCount: number;
  readonly value: string;
}

const toRank = (left: TokenClass, right: TokenClass): number => {
  if (left.useCount !== right.useCount) {
    return right.useCount - left.useCount;
  }

  return left.className.localeCompare(right.className);
};

const toTokenClasses = (
  tokens: readonly UsageToken[],
  uses: readonly TokenUse[],
  index: UsageIndex,
  query: string
): TokenClass[] => {
  const prefix = query.trim();
  const valueByName = new Map(tokens.map((token) => [token.name, token.value]));
  const countByName = new Map(uses.map((use) => [use.name, use.useCount]));
  const found: TokenClass[] = [];

  for (const [className, names] of index.classes) {
    if (className.startsWith(prefix)) {
      for (const tokenName of names) {
        found.push({
          className,
          tokenName,
          useCount: countByName.get(tokenName) ?? 0,
          value: valueByName.get(tokenName) ?? "",
        });
      }
    }
  }

  return found.toSorted(toRank);
};

export { toTokenClasses };

export type { TokenClass };
