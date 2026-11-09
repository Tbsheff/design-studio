import type { Effect } from "effect";

import { runDirectionRead, toDirectEditStatusFailure } from "./deps.js";
import type { DirectionRun, KnownFailure } from "./deps.js";
import { toTokenClasses, toTokenUses, toUsageIndex } from "./engine/index.js";
import type { TokenClass } from "./engine/index.js";
import { listScannedFiles } from "./token-usage-files.js";
import type { ScanCache } from "./token-usage-files.js";
import { toOffset, toUsageTokens } from "./token-usage-run.js";

interface ListTokenClassesCommand {
  readonly cursor: string | null;
  readonly directionId: string;
  readonly limit: number;
  readonly projectId: string;
  readonly query: string;
}

interface TokenClassPage {
  readonly items: readonly TokenClass[];
  readonly next: string | null;
}

const runList = async (
  cache: ScanCache,
  run: DirectionRun,
  command: ListTokenClassesCommand
): Promise<TokenClassPage> => {
  const tokens = await toUsageTokens(run);
  const index = toUsageIndex(tokens);
  const files = await listScannedFiles(cache, run.direction.workTree, index);
  const uses = toTokenUses(tokens, files);
  const classes = toTokenClasses(tokens, uses, index, command.query);
  const offset = toOffset(command.cursor);
  const end = offset + command.limit;
  let next: string | null = null;

  if (end < classes.length) {
    next = String(end);
  }

  return { items: classes.slice(offset, end), next };
};

const runTokenClassList = (
  cache: ScanCache,
  command: ListTokenClassesCommand
): Effect.Effect<TokenClassPage, KnownFailure> =>
  runDirectionRead(
    { directionId: command.directionId, projectId: command.projectId },
    (run) => runList(cache, run, command),
    toDirectEditStatusFailure
  );

export { runTokenClassList };

export type { ListTokenClassesCommand, TokenClassPage };
