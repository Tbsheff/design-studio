import {
  isVarAlias,
  toBlock,
  toDarkLines,
  toDeclaration,
  toJoinedBlocks,
} from "./css-blocks.js";
import { toAliasCount } from "./token-model.js";
import type { FormatOutput, PortableToken } from "./token-model.js";

const toCss = (tokens: readonly PortableToken[]): FormatOutput => {
  const root = tokens.map((token) => toDeclaration(token.cssVar, token.light));

  return {
    aliasCount: toAliasCount(isVarAlias, tokens),
    skipped: [],
    text: toJoinedBlocks([
      toBlock(":root", root),
      toBlock(".dark", toDarkLines(tokens)),
    ]),
    tokenCount: tokens.length,
  };
};

export { toCss };
