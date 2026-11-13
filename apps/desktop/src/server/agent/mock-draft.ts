import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";

import type { DriverInput } from "./lifecycle.js";
import { stopDraft, insertDraftChunk } from "./run-draft-feed.js";
import type { DraftTarget } from "./run-draft-feed.js";

const DRAFT_PARTS = 4;

const DRAFT_STEP_MS = 1200;

const hasFile = async (absolute: string): Promise<boolean> => {
  try {
    await access(absolute);

    return true;
  } catch {
    return false;
  }
};

const toDraftParts = (content: string): string[] => {
  const size = Math.ceil(content.length / DRAFT_PARTS);
  const parts: string[] = [];

  for (let start = 0; start < content.length; start += size) {
    parts.push(content.slice(start, start + size));
  }

  return parts;
};

const runDraftStream = async (
  input: DriverInput,
  toolUseId: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const target: DraftTarget = {
    directionId: input.ctx.direction.id,
    projectId: input.ctx.project.id,
    runId: input.runId,
  };

  const parts = toDraftParts(content);

  await Promise.all(
    parts.map(async (part, index) => {
      await wait(index * DRAFT_STEP_MS, null, { signal: input.signal });
      insertDraftChunk(target, toolUseId, relativePath, part);
    })
  );
  await wait(DRAFT_STEP_MS, null, { signal: input.signal });

  stopDraft(target, toolUseId);
};

const runDraftWrite = async (
  input: DriverInput,
  toolUseId: string,
  relativePath: string,
  content: string
): Promise<void> => {
  input.signal.throwIfAborted();
  const absolute = path.resolve(input.ctx.direction.workTree, relativePath);

  if (!(await hasFile(absolute))) {
    await runDraftStream(input, toolUseId, relativePath, content);
  }

  await writeFile(absolute, content);
};

export { runDraftWrite };
