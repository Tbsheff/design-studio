import { toTag, toVoidTag } from "./tags.js";

const HEAD_END = /<\/head\s*>/iu;

const BODY_END = /<\/body\s*>/iu;

const toInserted = (
  code: string,
  anchor: RegExp,
  insert: string
): string | null => {
  const match = anchor.exec(code);

  if (match === null) {
    return null;
  }

  return `${code.slice(0, match.index)}${insert}${code.slice(match.index)}`;
};

const toLinkedHtml = (code: string, href: string): string | null => {
  if (code.includes(`href="${href}"`)) {
    return code;
  }

  return toInserted(
    code,
    HEAD_END,
    toVoidTag("link", `rel="stylesheet" href="${href}"`)
  );
};

const toScriptedHtml = (code: string, source: string): string | null => {
  if (code.includes(`src="${source}"`)) {
    return code;
  }

  return toInserted(
    code,
    BODY_END,
    toTag("script", `src="${source}" defer`, "")
  );
};

export { toLinkedHtml, toScriptedHtml };
