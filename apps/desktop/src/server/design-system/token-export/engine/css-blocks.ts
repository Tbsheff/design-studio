import type { PortableToken, PortableValue } from "./token-model.js";

const toDeclarationValue = (value: PortableValue): string => {
  if (value.aliasVar !== null) {
    return `var(${value.aliasVar})`;
  }

  return value.text;
};

const toDeclaration = (name: string, value: PortableValue): string =>
  `  ${name}: ${toDeclarationValue(value)};`;

const toBlock = (selector: string, lines: readonly string[]): string => {
  if (lines.length === 0) {
    return "";
  }

  return `${selector} {\n${lines.join("\n")}\n}\n`;
};

const toDarkLines = (tokens: readonly PortableToken[]): readonly string[] =>
  tokens.flatMap((token) => {
    if (token.dark === null) {
      return [];
    }

    return [toDeclaration(token.cssVar, token.dark)];
  });

const toJoinedBlocks = (blocks: readonly string[]): string =>
  blocks.filter((block) => block !== "").join("\n");

const isVarAlias = (value: PortableValue): boolean => value.aliasVar !== null;

export { isVarAlias, toBlock, toDarkLines, toDeclaration, toJoinedBlocks };
