import { copy } from "./copy.js";

const UNSAFE = /[;{}<>\\]/u;
const WHITESPACE = /\s+/u;

const hasTextLine = (value: string, line: string): boolean =>
  value.split(WHITESPACE).includes(line);

const toToggledLine = (value: string, line: string): string => {
  const parts = value
    .split(WHITESPACE)
    .filter((part) => part !== "" && part !== "none");

  let next = [...parts, line];

  if (parts.includes(line)) {
    next = parts.filter((part) => part !== line);
  }

  if (next.length === 0) {
    return "none";
  }

  return next.join(" ");
};

const toReadonlyText = (state: string): string => {
  if (state === "children") {
    return copy.hasChildElements;
  }

  return copy.tooLongToEdit;
};

const toShownValue = (text: string | null, value: string): string => {
  if (text !== null) {
    return text;
  }

  if (value === "none") {
    return "";
  }

  return value;
};

const toCommittedValue = (next: string): string => {
  if (next === "") {
    return "none";
  }

  return next;
};

const toItalicNext = (isItalic: boolean): string => {
  if (isItalic) {
    return "normal";
  }

  return "italic";
};

const toOnClass = (isOn: boolean): string => {
  if (isOn) {
    return "on";
  }

  return "";
};

export {
  UNSAFE,
  hasTextLine,
  toCommittedValue,
  toItalicNext,
  toOnClass,
  toReadonlyText,
  toShownValue,
  toToggledLine,
};
