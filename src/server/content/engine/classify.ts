import { PRESETS } from "./samples.js";
import type { Kind, Preset } from "./samples.js";

const INITIALS_PATTERN = /^[A-Z]{1,3}$/u;

const EMAIL_PATTERN = /[^\s@]{1,64}@[^\s@]{1,64}/u;

const DATE_PATTERN =
  /\d{1,4}[/-]\d{1,2}[/-]\d{1,4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b(?:today|yesterday|ago)\b/iu;

const AMOUNT_PATTERN = /^[$€£]?\s?\d[\d,.]*\s?[%kKmM]?$/u;

const STATUS_PATTERN =
  /^(?:active|pending|paid|draft|done|open|closed|new|failed|online|offline|status|badge|tag)$/iu;

const classifyText = (text: string): Kind | null => {
  const trimmed = text.trim();

  if (INITIALS_PATTERN.test(trimmed)) {
    return "initials";
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    return "email";
  }

  if (DATE_PATTERN.test(trimmed)) {
    return "date";
  }

  if (AMOUNT_PATTERN.test(trimmed)) {
    return "amount";
  }

  if (STATUS_PATTERN.test(trimmed)) {
    return "status";
  }

  return null;
};

const kindFor = (text: string, preset: Preset, columnIndex: number): Kind => {
  const found = classifyText(text);

  if (found !== null) {
    return found;
  }

  const { columns } = PRESETS[preset];

  return columns[columnIndex % columns.length] as Kind;
};

export { kindFor };
