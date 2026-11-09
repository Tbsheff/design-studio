import { Effect } from "effect";

import {
  directEditRuntimeOf,
  runDirectionRead,
} from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import { probeOnPage } from "../../page-probe/index.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { requireBound } from "../../platform/runtime-slot/index.js";
import { withPagePath } from "../../project-source/index.js";
import { toSpellingHit, toSpellingMisses } from "./engine/to-spelling-hits.js";
import type { SpellingHitDraft } from "./engine/to-spelling-hits.js";
import type { LoadChecker } from "./spelling-checker.js";
import { toSpellingFailure } from "./spelling-failure.js";
import { toSpellingFrame } from "./spelling-frame.js";
import { spellingProbe } from "./spelling-probe.js";
import type { RawSpellingProbe } from "./spelling-probe.js";
import {
  getSpellingWords,
  getSpellingSeedTexts,
  setSpellingWords,
} from "./spelling-words-file.js";
import { toKnownWords } from "./spelling-words.js";

interface InspectSpellingCommand extends DirectionIds {
  readonly frameId: string | null;
}

interface SpellingReport {
  readonly frameId: string;
  readonly hits: readonly SpellingHitDraft[];
  readonly words: readonly string[];
}

const SUGGEST_MAX = 200;

const runSpellingInspect = (
  command: InspectSpellingCommand,
  loadChecker: LoadChecker
): Effect.Effect<SpellingReport, KnownFailure> =>
  runDirectionRead(
    command,
    async ({ direction, project, runtime }): Promise<SpellingReport> => {
      const [frame, base] = await Promise.all([
        toSpellingFrame(runtime.canvas, project, direction, command.frameId),
        runtime.preview.directionUrl(project, direction),
      ]);

      const [raw, checker, saved, seeds] = await Promise.all([
        probeOnPage<RawSpellingProbe>(
          runtime.preview,
          withPagePath(base, frame.page),
          { height: frame.viewport.height, width: frame.viewport.width },
          spellingProbe
        ),
        loadChecker(),
        getSpellingWords(runtime.projectDir(project.id)),
        getSpellingSeedTexts(direction.workTree),
      ]);

      const known = toKnownWords([...saved, ...seeds]);

      const misses = toSpellingMisses(raw.texts, checker.isCorrect, known);

      return {
        frameId: frame.id,
        hits: misses
          .slice(0, SUGGEST_MAX)
          .map((miss) => toSpellingHit(miss, checker.suggest)),
        words: saved,
      };
    },
    toSpellingFailure
  );

const runSpellingSet = (
  projectId: string,
  words: readonly string[]
): Effect.Effect<string[], KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("DirectEdit", directEditRuntimeOf());

    return yield* attemptKnown(() =>
      setSpellingWords(runtime.projectDir(projectId), projectId, words)
    );
  });

export { runSpellingInspect, runSpellingSet };

export type { InspectSpellingCommand, SpellingReport };
