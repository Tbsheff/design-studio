import {
  isVarAlias,
  toBlock,
  toDarkLines,
  toDeclaration,
  toJoinedBlocks,
} from "./css-blocks.js";
import { toAliasCount } from "./token-model.js";
import type { FormatOutput, PortableToken } from "./token-model.js";

const THEME_NAMESPACE =
  /^--(?:color|font|text|font-weight|tracking|leading|breakpoint|container|spacing|radius|shadow|inset-shadow|drop-shadow|blur|perspective|aspect|ease|animate)(?:-|$)/u;

const isThemeToken = (token: PortableToken): boolean =>
  THEME_NAMESPACE.test(token.cssVar);

const toLines = (tokens: readonly PortableToken[]): readonly string[] =>
  tokens.map((token) => toDeclaration(token.cssVar, token.light));

const toTailwind = (tokens: readonly PortableToken[]): FormatOutput => {
  const theme = tokens.filter((token) => isThemeToken(token));
  const rest = tokens.filter((token) => !isThemeToken(token));

  return {
    aliasCount: toAliasCount(isVarAlias, tokens),
    skipped: [],
    text: toJoinedBlocks([
      toBlock("@theme", toLines(theme)),
      toBlock(":root", toLines(rest)),
      toBlock(".dark", toDarkLines(tokens)),
    ]),
    tokenCount: tokens.length,
  };
};

export { toTailwind };
