import { PHOTO_ATTR } from "./photo-slots.js";
import type { PhotoSlot } from "./photo-slots.js";

const MISSED_ATTR = "data-photo-missed";

const TAG_NAME = /^<(?<tag>[A-Za-z][\w-]*)/u;

const TAG_NAME_MAX = 64;

const LABEL_TAG =
  /^<(?<label>span|small|p|strong|em|b|i)\b[^<>]*>[^<]*<\/\k<label>>$/u;

const toOffset = (
  code: string,
  position: { readonly col: number; readonly line: number }
): number => {
  const lines = code.split("\n").slice(0, position.line - 1);

  return (
    lines.reduce((sum, line) => sum + line.length + 1, 0) + position.col - 1
  );
};

const toQuote = (quote: string, char: string): string => {
  if (quote !== "") {
    if (char === quote) {
      return "";
    }

    return quote;
  }

  if (char === '"' || char === "'") {
    return char;
  }

  return "";
};

const toTagEnd = (code: string, from: number): number => {
  let quote = "";

  for (let index = from; index < code.length; index += 1) {
    const char = code.charAt(index);

    if (quote === "" && char === ">") {
      return index + 1;
    }

    quote = toQuote(quote, char);
  }

  return -1;
};

const toLabelFree = (
  code: string,
  position: { readonly col: number; readonly line: number }
): string => {
  const offset = toOffset(code, position);
  const head = code.slice(offset, offset + TAG_NAME_MAX);
  const tag = TAG_NAME.exec(head)?.groups?.tag ?? "";

  const start = toTagEnd(code, offset);

  if (tag === "" || start === -1) {
    return code;
  }

  const end = code.indexOf(`</${tag}>`, start);
  const inner = code.slice(start, Math.max(end, start));

  if (end === -1 || inner.trim() === "") {
    return code;
  }

  if (inner.includes("<") && !LABEL_TAG.test(inner.trim())) {
    return code;
  }

  return `${code.slice(0, start)}${code.slice(end)}`;
};

const toOpenTag = (source: string, slot: PhotoSlot): string => {
  const offset = toOffset(source, { col: slot.col, line: slot.line });

  return source.slice(offset, Math.max(toTagEnd(source, offset), offset));
};

const isMarkedMiss = (source: string, slot: PhotoSlot): boolean => {
  const tag = toOpenTag(source, slot);

  return (
    tag.includes(`${MISSED_ATTR}="${slot.query}"`) ||
    tag.includes(`${MISSED_ATTR}='${slot.query}'`)
  );
};

const RETRY_HINT = `To search a missed slot again, change its ${PHOTO_ATTR} words or remove ${MISSED_ATTR}.`;

const toSkipNote = (skipped: number): string | null => {
  if (skipped === 0) {
    return null;
  }

  return `${skipped} slot(s) with ${MISSED_ATTR} had no result before, so no search ran for them. ${RETRY_HINT}`;
};

const toIdleNote = (relative: string, skipped: number): string => {
  if (skipped > 0) {
    return `${relative} has only slots that had no result before (${MISSED_ATTR}), so nothing changed and no search ran. ${RETRY_HINT}`;
  }

  return `${relative} has no ${PHOTO_ATTR} slot left, so nothing changed and no search ran. Do not call apply_image_search again on this page. To add a photo, write an img or element with ${PHOTO_ATTR}="<2 to 6 search words>".`;
};

export { MISSED_ATTR, isMarkedMiss, toIdleNote, toLabelFree, toSkipNote };
