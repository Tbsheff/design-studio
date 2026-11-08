import type { DriftMatch, Splice } from "./types.js";

const WHITESPACE_PATTERN = /\s/u;

const toGapLength = (code: string, at: number): number => {
  let length = 0;

  while (
    at - length > 0 &&
    WHITESPACE_PATTERN.test(code.charAt(at - length - 1))
  ) {
    length += 1;
  }

  return length;
};

const hasAttribute = (match: DriftMatch, name: string): boolean =>
  match.element.attributes.some((attribute) => attribute.name === name);

const toPropText = (match: DriftMatch): string => {
  const parts: string[] = [];

  if (match.setVariant !== null && !hasAttribute(match, "variant")) {
    parts.push(` variant="${match.setVariant}"`);
  }

  if (match.setSize !== null && !hasAttribute(match, "size")) {
    parts.push(` size="${match.setSize}"`);
  }

  return parts.join("");
};

const toClassText = (match: DriftMatch): string => {
  if (match.keptClasses.length === 0) {
    return "";
  }

  return ` className="${match.keptClasses.join(" ")}"`;
};

const toClassSplices = (code: string, match: DriftMatch): Splice[] => {
  const { className } = match;

  if (className === null || className.kind !== "string") {
    return [];
  }

  if (match.tag !== "a-as-button" && match.keptClasses.length > 0) {
    return [
      {
        end: className.end,
        start: className.start,
        text: toClassText(match).trimStart(),
      },
    ];
  }

  return [
    {
      end: className.end,
      start: className.start - toGapLength(code, className.start),
      text: "",
    },
  ];
};

const toRenameSplices = (match: DriftMatch): Splice[] => {
  const { element } = match;

  const splices: Splice[] = [
    {
      end: element.nameEnd,
      start: element.nameStart,
      text: `${match.component}${toPropText(match)}`,
    },
  ];

  if (element.closeNameStart !== null && element.closeNameEnd !== null) {
    splices.push({
      end: element.closeNameEnd,
      start: element.closeNameStart,
      text: match.component,
    });
  }

  return splices;
};

const toWrapSplices = (match: DriftMatch): Splice[] => {
  const { element } = match;

  return [
    {
      end: element.elementStart,
      start: element.elementStart,
      text: `<${match.component} asChild${toPropText(match)}${toClassText(match)}>`,
    },
    {
      end: element.elementEnd,
      start: element.elementEnd,
      text: `</${match.component}>`,
    },
  ];
};

const toDriftSplices = (code: string, match: DriftMatch): Splice[] => {
  const classSplices = toClassSplices(code, match);

  if (match.tag === "a-as-button") {
    return [...toWrapSplices(match), ...classSplices];
  }

  return [...toRenameSplices(match), ...classSplices];
};

const applySplices = (code: string, splices: readonly Splice[]): string => {
  const ordered = splices.toSorted((left, right) => right.start - left.start);
  let result = code;

  for (const splice of ordered) {
    result = `${result.slice(0, splice.start)}${splice.text}${result.slice(splice.end)}`;
  }

  return result;
};

export { applySplices, toDriftSplices };
