import { toPlanned, toRefusal } from "./types.js";
import type { Outcome, Splice } from "./types.js";

const OVERLAP = "Two changes touch the same code. Nothing was written.";

const toStartOrder = (left: Splice, right: Splice): number =>
  right.start - left.start;

const applySplices = (
  code: string,
  splices: readonly Splice[]
): Outcome<string> => {
  const ordered = splices.toSorted(toStartOrder);
  let output = code;
  let limit = code.length;

  for (const splice of ordered) {
    if (splice.end > limit || splice.start < 0) {
      return toRefusal("bad_request", OVERLAP);
    }

    output = `${output.slice(0, splice.start)}${splice.text}${output.slice(splice.end)}`;
    limit = splice.start;
  }

  return toPlanned(output);
};

const toInsertAfter = (
  code: string,
  lastEnd: number,
  text: string,
  separator: string
): Splice => {
  let after = lastEnd;

  while (after < code.length && /\s/u.test(code[after] ?? "")) {
    after += 1;
  }

  if (code[after] === ",") {
    return {
      end: after + 1,
      start: after + 1,
      text: `${separator}${text},`,
    };
  }

  return { end: lastEnd, start: lastEnd, text: `,${separator}${text}` };
};

const toRemoveItem = (
  items: readonly { readonly end: number; readonly start: number }[],
  index: number
): Splice | null => {
  const item = items[index];

  if (!item) {
    return null;
  }

  const next = items[index + 1];

  if (next) {
    return { end: next.start, start: item.start, text: "" };
  }

  const previous = items[index - 1];

  if (previous) {
    return { end: item.end, start: previous.end, text: "" };
  }

  return { end: item.end, start: item.start, text: "" };
};

export { applySplices, toInsertAfter, toRemoveItem };
