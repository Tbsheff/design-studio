import { extractJson } from "../../shared/extract-json.js";
import type { JsonValue } from "../../shared/extract-json.js";

const toJsonOrNull = (text: string): JsonValue | null => {
  try {
    return extractJson(text);
  } catch {
    return null;
  }
};

export { toJsonOrNull };
