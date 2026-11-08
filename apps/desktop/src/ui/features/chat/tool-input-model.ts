import { isFieldSource, isText } from "../../platform/json-guard.js";

const SHORT_INPUT_CHARS = 80;

const SHORT_INPUT_KEYS = [
  "file_path",
  "path",
  "filePath",
  "pattern",
  "command",
  "url",
  "query",
];

type ToolInput =
  | string
  | number
  | boolean
  | null
  | ToolInput[]
  | { [key: string]: ToolInput };

const toToolFields = (input: ToolInput): ReadonlyMap<string, string> => {
  if (!isFieldSource(input)) {
    return new Map();
  }

  return new Map(
    Object.entries(input).flatMap(([key, value]) => {
      if (isText(value)) {
        return [[key, value] as const];
      }

      return [];
    })
  );
};

const shortInput = (input: ToolInput): string => {
  if (input === null) {
    return "";
  }

  if (isText(input)) {
    return input.slice(0, SHORT_INPUT_CHARS);
  }

  if (!isFieldSource(input) && !Array.isArray(input)) {
    return String(input);
  }

  const fields = toToolFields(input);

  for (const key of SHORT_INPUT_KEYS) {
    if (fields.has(key)) {
      return (fields.get(key) ?? "").slice(0, SHORT_INPUT_CHARS);
    }
  }

  return JSON.stringify(input).slice(0, SHORT_INPUT_CHARS);
};

export { shortInput, toToolFields };

export type { ToolInput };
