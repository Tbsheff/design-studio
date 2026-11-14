import { decodeEntities } from "@design-studio/contracts/html-entities";

import type { ImageOrientation } from "./deps.js";

interface PhotoSlot {
  readonly alt: string | null;
  readonly col: number;
  readonly hasArt: boolean;
  readonly hasImage: boolean;
  readonly isImg: boolean;
  readonly line: number;
  readonly orientation: ImageOrientation;
  readonly query: string;
  readonly style: string | null;
}

const PHOTO_ATTR = "data-photo";

const ART_ATTR = "data-photo-art";

const STYLE_URL = /url\(/iu;

const WIDE_RATIO = 1.2;

const TALL_RATIO = 0.83;

const SPACES = /\s+/gu;

const COMMENT = /<!--[\s\S]*?-->/gu;

const NOT_NEWLINE = /[^\n]/gu;

const OPEN_TAG =
  /<(?<tag>[A-Za-z][\w.]*)(?<attrs>\s(?:[^<>"'{}]|"[^"]*"|'[^']*'|\{[^{}]*\})*)>/gu;

const toAttrPattern = (name: string): RegExp =>
  new RegExp(
    String.raw`(?:^|\s)${name}=(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|\{\s*(?:"(?<braced>[^"]*)"|(?<number>\d+(?:\.\d+)?))\s*\})`,
    "u"
  );

const ATTRS = {
  alt: toAttrPattern("alt"),
  art: toAttrPattern(ART_ATTR),
  height: toAttrPattern("height"),
  photo: toAttrPattern(PHOTO_ATTR),
  src: toAttrPattern("src"),
  style: toAttrPattern("style"),
  width: toAttrPattern("width"),
} as const;

const toAttrValue = (attrs: string, pattern: RegExp): string | null => {
  const groups = pattern.exec(attrs)?.groups ?? null;

  if (groups === null) {
    return null;
  }

  const found = [
    groups.double,
    groups.single,
    groups.braced,
    groups.number,
  ].find(Boolean);

  return found ?? null;
};

const toSize = (value: string | null): number | null => {
  const size = Number(value ?? "");

  if (!Number.isFinite(size) || size <= 0) {
    return null;
  }

  return size;
};

const toOrientation = (attrs: string): ImageOrientation => {
  const across = toSize(toAttrValue(attrs, ATTRS.width));
  const down = toSize(toAttrValue(attrs, ATTRS.height));

  if (across === null || down === null) {
    return "any";
  }

  const ratio = across / down;

  if (ratio >= WIDE_RATIO) {
    return "wide";
  }

  if (ratio <= TALL_RATIO) {
    return "tall";
  }

  return "square";
};

const toBlankComments = (source: string): string =>
  source.replaceAll(COMMENT, (comment) => comment.replaceAll(NOT_NEWLINE, " "));

interface SlotPosition {
  readonly col: number;
  readonly line: number;
}

const toPosition = (source: string, index: number): SlotPosition => {
  const before = source.slice(0, index).split("\n");
  const last = before.at(-1) ?? "";

  return { col: last.length + 1, line: before.length };
};

const toSlot = (source: string, match: RegExpExecArray): PhotoSlot | null => {
  const attrs = match.groups?.attrs ?? "";
  const words = toAttrValue(attrs, ATTRS.photo);

  const cleaned = decodeEntities(words ?? "")
    .replaceAll(SPACES, " ")
    .trim();

  if (cleaned === "") {
    return null;
  }

  const position = toPosition(source, match.index);
  const style = toAttrValue(attrs, ATTRS.style);
  const hasSrc = (toAttrValue(attrs, ATTRS.src) ?? "").trim() !== "";

  return {
    alt: toAttrValue(attrs, ATTRS.alt),
    col: position.col,
    hasArt: ATTRS.art.test(attrs),
    hasImage: hasSrc || STYLE_URL.test(style ?? ""),
    isImg: match.groups?.tag === "img",
    line: position.line,
    orientation: toOrientation(attrs),
    query: cleaned,
    style,
  };
};

const toPhotoSlots = (source: string): readonly PhotoSlot[] => {
  const text = toBlankComments(source);

  return [...text.matchAll(OPEN_TAG)].flatMap((match) => {
    const slot = toSlot(text, match);

    if (slot === null) {
      return [];
    }

    return [slot];
  });
};

const isHtmlPage = (relative: string): boolean => /\.html?$/iu.test(relative);

const isTypescriptPage = (relative: string): boolean =>
  /\.tsx$/iu.test(relative);

export {
  ART_ATTR,
  PHOTO_ATTR,
  isHtmlPage,
  isTypescriptPage,
  toOrientation,
  toPhotoSlots,
};

export type { PhotoSlot };
