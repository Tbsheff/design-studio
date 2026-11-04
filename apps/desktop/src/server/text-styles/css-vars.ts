interface CssBlock {
  body: string;
  bodyEnd: number;
  bodyStart: number;
}

const BLOCK_START = /(?<head>@theme|:root)[^{]{0,40}\{/gu;
const TAILWIND_IMPORT = /@import\s+(?:url\()?["']tailwindcss/u;
const THEME_AT = /@theme\b/u;

const depthStep = (char: string | undefined): number => {
  if (char === "{") {
    return 1;
  }

  if (char === "}") {
    return -1;
  }

  return 0;
};

const closingBrace = (text: string, from: number): number => {
  let depth = 1;

  for (let index = from; index < text.length; index += 1) {
    depth += depthStep(text[index]);

    if (depth === 0) {
      return index;
    }
  }

  return -1;
};

const blocksOf = (text: string, kind: "root" | "theme"): CssBlock[] => {
  const blocks: CssBlock[] = [];
  const wanted = kind === "theme";

  for (const match of text.matchAll(BLOCK_START)) {
    const isTheme = match.groups?.["head"] === "@theme";
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = closingBrace(text, bodyStart);

    if (isTheme === wanted && bodyEnd > bodyStart) {
      blocks.push({ body: text.slice(bodyStart, bodyEnd), bodyEnd, bodyStart });
    }
  }

  return blocks;
};

const addDecl = (vars: Map<string, string>, decl: string): void => {
  const colon = decl.indexOf(":");
  const name = decl.slice(0, colon).trim();
  const value = decl.slice(colon + 1).trim();

  if (colon > 0 && name.startsWith("--") && value && !vars.has(name)) {
    vars.set(name, value);
  }
};

const varsOf = (blocks: CssBlock[]): Map<string, string> => {
  const vars = new Map<string, string>();

  for (const block of blocks) {
    for (const decl of block.body.split(";")) {
      addDecl(vars, decl);
    }
  }

  return vars;
};

const isTailwindCss = (text: string): boolean =>
  TAILWIND_IMPORT.test(text) || THEME_AT.test(text);

export { blocksOf, isTailwindCss, varsOf };

export type { CssBlock };
