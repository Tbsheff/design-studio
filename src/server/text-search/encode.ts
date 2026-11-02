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

const replaceChars = (
  text: string,
  pattern: RegExp,
  table: Readonly<Record<string, string>>
): string => text.replaceAll(pattern, (char) => table[char] ?? char);

const encodeHtmlText = (text: string): string =>
  replaceChars(text, /[&<>]/gu, HTML_TEXT);

const encodeJsxText = (text: string): string =>
  replaceChars(text, /[&<>{}]/gu, JSX_TEXT);

const markupAttribute =
  (quote: string) =>
  (text: string): string => {
    const amp = text.replaceAll("&", "&amp;");

    if (quote === "") {
      return replaceChars(amp, /["']/gu, QUOTES).replaceAll(/\s/gu, "&#32;");
    }

    return replaceChars(amp, new RegExp(quote, "gu"), QUOTES);
  };

const jsString =
  (quote: string) =>
  (text: string): string => {
    const escaped = replaceChars(text, /[\n\r\t\\]/gu, JS_ESCAPES).replaceAll(
      quote,
      `\\${quote}`
    );

    if (quote === "`") {
      return escaped.replaceAll("${", "\\${");
    }

    return escaped;
  };

export { encodeHtmlText, encodeJsxText, jsString, markupAttribute };
