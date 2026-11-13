import type { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import type { Effect } from "effect";

import {
  runDirectionRead,
  runDirectionWrite,
} from "../../direct-edit/index.js";
import type { DirectionIds, DirectionRun } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { applyTextRange } from "./apply-range.js";
import type { TextRangeRequest, TextRangeResult } from "./apply-range.js";
import type {
  TextSearchQuery,
  TextSearchResult,
  TextUpdateRequest,
  TextUpdateResult,
} from "./deps.js";
import type { SearchTarget } from "./scope.js";
import { searchText } from "./search-text.js";
import {
  toTextSearchFailure,
  toTextWriteFailure,
} from "./text-search-failure.js";
import { applyTextUpdate } from "./update-text.js";

interface InspectTextCommand extends DirectionIds {
  readonly limit: number;
  readonly query: TextSearchQuery;
}

interface UpdateTextCommand extends DirectionIds {
  readonly request: TextUpdateRequest;
}

interface ApplyRangeCommand extends DirectionIds {
  readonly request: TextRangeRequest;
}

const CLIENT = "studio";

const toSearchTarget = async ({
  direction,
  project,
  runtime,
}: DirectionRun): Promise<SearchTarget> => {
  const snapshot = await runtime.canvas.read(project);
  const frames = snapshot.canvas?.frames ?? [];

  return { direction, frames, project };
};

const runTextInspect = (
  command: InspectTextCommand
): Effect.Effect<TextSearchResult, KnownFailure> =>
  runDirectionRead(
    command,
    async (run): Promise<TextSearchResult> => {
      const found = await searchText(await toSearchTarget(run), command.query);

      return { ...found, hits: found.hits.slice(0, command.limit) };
    },
    toTextSearchFailure
  );

const runTextUpdate = (
  command: UpdateTextCommand
): Effect.Effect<TextUpdateResult, Forbidden | KnownFailure> =>
  runDirectionWrite(
    command,
    async (run): Promise<TextUpdateResult> => {
      const done = await applyTextUpdate(
        await toSearchTarget(run),
        command.request,
        {
          client: CLIENT,
          deps: run.runtime.editDeps,
          history: run.runtime.editDeps.history ?? null,
        }
      );

      return done.result;
    },
    toTextWriteFailure
  );

const runTextRange = (
  command: ApplyRangeCommand
): Effect.Effect<TextRangeResult, KnownFailure> =>
  runDirectionWrite(
    command,
    async (run): Promise<TextRangeResult> =>
      await applyTextRange(await toSearchTarget(run), command.request, {
        client: CLIENT,
        deps: run.runtime.editDeps,
        history: run.runtime.editDeps.history ?? null,
      }),
    toTextSearchFailure
  );

export { runTextInspect, runTextRange, runTextUpdate };

export type { ApplyRangeCommand, InspectTextCommand, UpdateTextCommand };
