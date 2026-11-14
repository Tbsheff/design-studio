import { matchesKey } from "./keymap.js";
import type { KeyInput } from "./keymap.js";

const TEXT_KEY_IDS = [
  "text-bold",
  "text-underline",
  "text-strike",
  "text-align-left",
  "text-align-center",
  "text-align-right",
  "text-align-justify",
] as const;

type TextKeyId = (typeof TEXT_KEY_IDS)[number];

const TEXT_KEY_SET: ReadonlySet<string> = new Set(TEXT_KEY_IDS);

const MAC_ONLY_KEYS: ReadonlySet<TextKeyId> = new Set(["text-align-center"]);

const toTextKeyId = (event: KeyInput, isMac: boolean): TextKeyId | null => {
  const id = TEXT_KEY_IDS.find((entry) => matchesKey(entry, event, isMac));

  if (!id || (!isMac && MAC_ONLY_KEYS.has(id))) {
    return null;
  }

  return id;
};

const isTextKeyId = (value: string): value is TextKeyId =>
  TEXT_KEY_SET.has(value);

export { isTextKeyId, toTextKeyId };

export type { TextKeyId };
