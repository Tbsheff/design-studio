const HTML_TEXT = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
} as const satisfies Readonly<Record<string, string>>;

const JSX_TEXT = {
  ...HTML_TEXT,
  "{": "&#123;",
  "}": "&#125;",
} as const satisfies Readonly<Record<string, string>>;

const QUOTES = {
  '"': "&quot;",
  "'": "&#39;",
} as const satisfies Readonly<Record<string, string>>;

const JS_ESCAPES = {
  "\t": String.raw`\t`,
  "\n": String.raw`\n`,
  "\r": String.raw`\r`,
  "\\": String.raw`\\`,
} as const satisfies Readonly<Record<string, string>>;

const toReplaceChars = (
  text: string,
  pattern: RegExp,
  table: Readonly<Record<string, string>>
): string => text.replaceAll(pattern, (char) => table[char] ?? char);

const toEncodeHtmlText = (text: string): string =>
  toReplaceChars(text, /[&<>]/gu, HTML_TEXT);

const toEncodeJsxText = (text: string): string =>
  toReplaceChars(text, /[&<>{}]/gu, JSX_TEXT);

const toMarkupAttribute =
  (quote: string) =>
  (text: string): string => {
    const amp = text.replaceAll("&", "&amp;");

    if (quote === "") {
      return toReplaceChars(amp, /["']/gu, QUOTES).replaceAll(/\s/gu, "&#32;");
    }

    return toReplaceChars(amp, new RegExp(quote, "gu"), QUOTES);
  };

const toJsString =
  (quote: string) =>
  (text: string): string => {
    const escaped = toReplaceChars(text, /[\n\r\t\\]/gu, JS_ESCAPES).replaceAll(
      quote,
      `\\${quote}`
    );

    if (quote === "`") {
      return escaped.replaceAll("${", "\\${");
    }

    return escaped;
  };

export {
  toEncodeHtmlText as encodeHtmlText,
  toEncodeJsxText as encodeJsxText,
  toJsString as jsString,
  toMarkupAttribute as markupAttribute,
};
