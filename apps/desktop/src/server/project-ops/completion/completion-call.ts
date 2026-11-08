import { createHash, randomBytes } from "node:crypto";

import type { CompletionRecord } from "./completion-file.js";

const HASH_LENGTH = 16;

const ID_BYTES = 6;

const START_CHARS = 120;

const toPromptHash = (prompt: string): string =>
  createHash("sha256").update(prompt).digest("hex").slice(0, HASH_LENGTH);

const toCompletionId = (): string =>
  `cmp_${randomBytes(ID_BYTES).toString("hex")}`;

const toRecord = (
  fields: Pick<CompletionRecord, "costUsd" | "frame" | "model" | "ms">,
  prompt: string
): CompletionRecord => ({
  ...fields,
  at: Date.now(),
  id: toCompletionId(),
  promptHash: toPromptHash(prompt),
  promptStart: prompt.slice(0, START_CHARS),
});

export { toRecord };
