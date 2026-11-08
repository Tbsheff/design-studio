import type { TextFromData } from "@design-studio/contracts";

import type { DirectEdit } from "./deps.js";

interface SourcePoint {
  readonly file: string;
  readonly line: number;
}

type TextEditScope = Pick<
  DirectEdit,
  "scope" | "text" | "status" | "previewText" | "revertText" | "commit"
>;

const PROMPT_LIMIT = 80;

const toSourceLoc = (source: SourcePoint): string =>
  `${source.file}:${source.line}`;

const toShortLoc = (source: SourcePoint): string =>
  `${source.file.split("/").pop() ?? source.file}:${source.line}`;

const toShownText = (text: string): string => {
  if (text.length > PROMPT_LIMIT) {
    return `${text.slice(0, PROMPT_LIMIT - 1)}…`;
  }

  return text;
};

const toDataTextPrompt = (text: string, data: TextFromData): string =>
  `The text "${toShownText(text)}" comes from data: ${data.expression} in ${toSourceLoc(data)}. Change it to: `;

const toSharedText = (shared: string | null): string => {
  if (shared) {
    return ` ${shared}`;
  }

  return "";
};

const toSharedLine = (name: string | null, what: string): string => {
  if (name) {
    return `Changes every ${name}.`;
  }

  return `Changes every use of ${what}.`;
};

export {
  toDataTextPrompt,
  toShortLoc,
  toSharedLine,
  toSharedText,
  toSourceLoc,
};

export type { TextEditScope };
