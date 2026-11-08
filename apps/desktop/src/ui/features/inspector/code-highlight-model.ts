type TokenKind = "attr" | "comment" | "plain" | "punct" | "string" | "tag";

interface CodeToken {
  readonly kind: TokenKind;
  readonly start: number;
  readonly text: string;
}

const TOKEN =
  /(?<comment><!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\})|(?<tag><\/?[A-Za-z][\w.:-]*|\/?>)|(?<string>"[^"]*"|'[^']*'|`[^`]*`)|(?<attr>[A-Za-z_:][\w:.-]*)|(?<punct>\{|\})/gu;

const toMatchKind = (
  match: RegExpMatchArray,
  code: string
): TokenKind | null => {
  const groups = match.groups ?? {};

  if (groups.comment) {
    return "comment";
  }

  if (groups.tag) {
    return "tag";
  }

  if (groups.string) {
    return "string";
  }

  if (groups.attr) {
    if (code.charAt((match.index ?? 0) + match[0].length) === "=") {
      return "attr";
    }

    return null;
  }

  return "punct";
};

const toCodeTokens = (code: string): CodeToken[] => {
  const out: CodeToken[] = [];
  let at = 0;

  for (const match of code.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    const kind = toMatchKind(match, code);

    if (kind !== null) {
      if (start > at) {
        out.push({ kind: "plain", start: at, text: code.slice(at, start) });
      }

      out.push({ kind, start, text: match[0] });
      at = start + match[0].length;
    }
  }

  if (at < code.length) {
    out.push({ kind: "plain", start: at, text: code.slice(at) });
  }

  return out;
};

export { toCodeTokens };

export type { CodeToken, TokenKind };
