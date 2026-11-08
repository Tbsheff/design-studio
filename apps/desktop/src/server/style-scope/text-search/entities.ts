import { parseFragment } from "parse5";

import type { Piece } from "./segment.js";

const ENTITY = /&(?:#\d+|#[xX][\da-fA-F]+|[A-Za-z][\dA-Za-z]*);/uy;

const decoded = new Map<string, string>();

const toDecodeEntity = (token: string): string => {
  const known = decoded.get(token);

  if (known) {
    return known;
  }

  const [node] = parseFragment(token).childNodes;
  let text = token;

  if (node?.nodeName === "#text" && "value" in node) {
    text = node.value;
  }

  decoded.set(token, text);

  return text;
};

const toMarkupPieces = (
  source: string,
  start: number,
  end: number
): Piece[] => {
  const pieces: Piece[] = [];
  let at = start;

  while (at < end) {
    ENTITY.lastIndex = at;
    const entity = source[at] === "&" && ENTITY.exec(source);

    if (entity && at + entity[0].length <= end) {
      pieces.push({
        end: at + entity[0].length,
        start: at,
        text: toDecodeEntity(entity[0]),
      });
      at += entity[0].length;
    } else {
      pieces.push({ end: at + 1, start: at, text: source.charAt(at) });
      at += 1;
    }
  }

  return pieces;
};

const toPlainPieces = (source: string, start: number, end: number): Piece[] => {
  const pieces: Piece[] = [];

  for (let at = start; at < end; at += 1) {
    pieces.push({ end: at + 1, start: at, text: source.charAt(at) });
  }

  return pieces;
};

export { toMarkupPieces as markupPieces, toPlainPieces as plainPieces };
