import type { DirectEditRequest } from "@design-studio/contracts";
import {
  hasLinkFamily,
  toGoogleFont,
  toGoogleFontsHref,
  toMergedHref,
} from "@design-studio/contracts/google-fonts";
import type { GoogleFont } from "@design-studio/contracts/google-fonts";

const HTML_FILE = /\.html?$/iu;

const GOOGLE_HREF = /https:\/\/fonts\.googleapis\.com\/css2?\?[^"'\s<>]+/gu;

const CSS2_HREF = /https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s<>]+/u;

const HEAD_CLOSE = /<\/head\s*>/iu;

const toEscapedAttr = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const toHtml = (parts: TemplateStringsArray, ...values: string[]): string =>
  parts.map((part, at) => `${part}${toEscapedAttr(values[at] ?? "")}`).join("");

const html = toHtml;

const toRequestFonts = (
  requests: readonly DirectEditRequest[]
): GoogleFont[] => {
  const fonts = new Map<string, GoogleFont>();

  for (const request of requests) {
    const font = toGoogleFont(request.style?.["font-family"] ?? "");

    if (font !== null) {
      fonts.set(font.family, font);
    }
  }

  return [...fonts.values()];
};

const toInsertedLink = (code: string, href: string): string => {
  const close = HEAD_CLOSE.exec(code);

  if (close === null) {
    return code;
  }

  const lineStart = code.lastIndexOf("\n", close.index) + 1;
  const lead = code.slice(lineStart, close.index);
  const tag = html`<link rel="stylesheet" href="${href}" />`;

  if (lead.trim() === "") {
    return `${code.slice(0, lineStart)}${lead}  ${tag}\n${code.slice(lineStart)}`;
  }

  return `${code.slice(0, close.index)}${tag}${code.slice(close.index)}`;
};

const toCodeWithFont = (code: string, font: GoogleFont): string => {
  const hrefs = [...code.matchAll(GOOGLE_HREF)].map((match) => match[0]);

  if (hrefs.some((href) => hasLinkFamily(href, font))) {
    return code;
  }

  const css2 = CSS2_HREF.exec(code);

  if (css2 === null) {
    return toInsertedLink(code, toGoogleFontsHref([font]));
  }

  return `${code.slice(0, css2.index)}${toMergedHref(css2[0], font)}${code.slice(css2.index + css2[0].length)}`;
};

const toFontLinkedCode = (
  relative: string,
  code: string,
  requests: readonly DirectEditRequest[]
): string => {
  if (!HTML_FILE.test(relative)) {
    return code;
  }

  let next = code;

  for (const font of toRequestFonts(requests)) {
    next = toCodeWithFont(next, font);
  }

  return next;
};

export { toFontLinkedCode };
