import type { CssDeclaration } from "./engine/index.js";

const STYLE_ATTR = /\sstyle\s*=\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)')/iu;

const toOffsetOf = (code: string, line: number, col: number): number => {
  let offset = 0;

  for (let row = 1; row < line; row += 1) {
    const next = code.indexOf("\n", offset);

    if (next === -1) {
      return code.length;
    }

    offset = next + 1;
  }

  return offset + Math.max(col - 1, 0);
};

const toDeclarationsOf = (text: string): CssDeclaration[] =>
  text.split(";").flatMap((part) => {
    const colon = part.indexOf(":");

    if (colon === -1) {
      return [];
    }

    const prop = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim();

    if (prop === "" || value === "") {
      return [];
    }

    return [{ prop, value }];
  });

const toInlineStyleOf = (
  code: string,
  line: number,
  col: number
): CssDeclaration[] => {
  const start = toOffsetOf(code, line, col);
  const end = code.indexOf(">", start);

  if (end === -1) {
    return [];
  }

  const hit = STYLE_ATTR.exec(code.slice(start, end));

  if (hit === null) {
    return [];
  }

  return toDeclarationsOf(hit.groups?.double ?? hit.groups?.single ?? "");
};

export { toInlineStyleOf as inlineStyleOf };
