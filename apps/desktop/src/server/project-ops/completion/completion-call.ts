import { createHash, randomBytes } from "node:crypto";

import type { CompletionRecord } from "./completion-file.js";
import { MOCK_MODEL } from "./completion-model.js";

const HASH_LENGTH = 16;

const ID_BYTES = 6;

const START_CHARS = 120;

const toPromptHash = (prompt: string): string =>
  createHash("sha256").update(prompt).digest("hex").slice(0, HASH_LENGTH);

const toCompletionId = (model: string, promptHash: string): string => {
  if (model === MOCK_MODEL) {
    return `cmp_mock_${promptHash}`;
  }

  return `cmp_${randomBytes(ID_BYTES).toString("hex")}`;
};

const toRecord = (
  fields: Pick<CompletionRecord, "costUsd" | "frame" | "model" | "ms">,
  prompt: string
): CompletionRecord => {
  const promptHash = toPromptHash(prompt);

  return {
    ...fields,
    at: Date.now(),
    id: toCompletionId(fields.model, promptHash),
    promptHash,
    promptStart: prompt.slice(0, START_CHARS),
  };
};

export { toRecord };
