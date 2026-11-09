import type { CompiledTokenEntry } from "@design-studio/contracts";
import type { Effect } from "effect";

import {
  readDesignSystemState,
  runDirectionRead,
  toDirectEditStatusFailure,
} from "./deps.js";
import type { DirectionRun, KnownFailure } from "./deps.js";
import { toTokenUses, toUsageIndex } from "./engine/index.js";
import type { TokenUse, UsageToken } from "./engine/index.js";
import { listScannedFiles } from "./token-usage-files.js";
import type { ScanCache } from "./token-usage-files.js";

interface ListTokenUsageCommand {
  readonly cursor: string | null;
  readonly directionId: string;
  readonly isUnusedOnly: boolean;
  readonly limit: number;
  readonly projectId: string;
}

interface TokenUsagePage {
  readonly items: readonly TokenUse[];
  readonly next: string | null;
  readonly tokenCount: number;
  readonly unusedCount: number;
}

const TOKENS_FILE = "tokens.json";

const toOffset = (cursor: string | null): number => {
  const offset = Number(cursor ?? "0");

  if (Number.isInteger(offset) && offset >= 0) {
    return offset;
  }

  return 0;
};

const toAliasTexts = (entry: CompiledTokenEntry): string[] => {
  if (entry.source) {
    return [entry.source.value, entry.source.darkValue ?? ""];
  }

  return [entry.value, entry.darkValue ?? ""];
};

const toEntryUsageTokens = (
  entries: readonly CompiledTokenEntry[]
): UsageToken[] =>
  entries.map((entry) => ({
    aliasTexts: toAliasTexts(entry),
    file: entry.source?.file ?? TOKENS_FILE,
    line: entry.source?.line ?? 1,
    name: entry.cssVar,
    value: entry.value,
  }));

const toUsageTokens = async (run: DirectionRun): Promise<UsageToken[]> => {
  const state = await readDesignSystemState(run.project, run.direction);

  return toEntryUsageTokens(state.entries);
};

const toRank = (left: TokenUse, right: TokenUse): number => {
  if (left.useCount !== right.useCount) {
    return right.useCount - left.useCount;
  }

  return left.name.localeCompare(right.name);
};

const runList = async (
  cache: ScanCache,
  run: DirectionRun,
  command: ListTokenUsageCommand
): Promise<TokenUsagePage> => {
  const tokens = await toUsageTokens(run);
  const index = toUsageIndex(tokens);
  const files = await listScannedFiles(cache, run.direction.workTree, index);
  const uses = toTokenUses(tokens, files).toSorted(toRank);
  const unused = uses.filter((use) => use.useCount === 0);
  let shown = uses;

  if (command.isUnusedOnly) {
    shown = unused;
  }

  const offset = toOffset(command.cursor);
  const end = offset + command.limit;
  let next: string | null = null;

  if (end < shown.length) {
    next = String(end);
  }

  const items = shown.slice(offset, end);

  return {
    items,
    next,
    tokenCount: uses.length,
    unusedCount: unused.length,
  };
};

interface FindTokenUsageCommand {
  readonly directionId: string;
  readonly name: string;
  readonly projectId: string;
}

const runFind = async (
  cache: ScanCache,
  run: DirectionRun,
  command: FindTokenUsageCommand
): Promise<TokenUse | null> => {
  const tokens = await toUsageTokens(run);
  const index = toUsageIndex(tokens);
  const files = await listScannedFiles(cache, run.direction.workTree, index);
  const uses = toTokenUses(tokens, files);

  return uses.find((use) => use.name === command.name) ?? null;
};

const runTokenUsageFind = (
  cache: ScanCache,
  command: FindTokenUsageCommand
): Effect.Effect<TokenUse | null, KnownFailure> =>
  runDirectionRead(
    { directionId: command.directionId, projectId: command.projectId },
    (run) => runFind(cache, run, command),
    toDirectEditStatusFailure
  );

const runTokenUsageList = (
  cache: ScanCache,
  command: ListTokenUsageCommand
): Effect.Effect<TokenUsagePage, KnownFailure> =>
  runDirectionRead(
    { directionId: command.directionId, projectId: command.projectId },
    (run) => runList(cache, run, command),
    toDirectEditStatusFailure
  );

export {
  runTokenUsageFind,
  runTokenUsageList,
  toEntryUsageTokens,
  toOffset,
  toUsageTokens,
};

export type { FindTokenUsageCommand, ListTokenUsageCommand, TokenUsagePage };
