import type { Effect } from "effect";

import { runDirectionRead } from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { toAccessibilityFailure } from "./accessibility-failure.js";
import { probeOnPage, withPagePath } from "./deps.js";
import { toReaderLines, toReaderPage } from "./engine/to-reader-lines.js";
import type { ReaderLine } from "./engine/to-reader-lines.js";
import { toAccessibilityFrame } from "./live-frame.js";
import { toReaderProbe } from "./reader-probe.js";
import type { RawReaderProbe } from "./reader-probe.js";

interface ListReaderLinesCommand extends DirectionIds {
  readonly cursor: string | null;
  readonly frame: string | null;
  readonly limit: number;
}

interface ReaderLinesResult {
  readonly frame: string;
  readonly items: readonly ReaderLine[];
  readonly next: string | null;
  readonly total: number;
}

const READER_LINES_MAX = 2000;

const runReaderLines = (
  command: ListReaderLinesCommand
): Effect.Effect<ReaderLinesResult, KnownFailure> =>
  runDirectionRead(
    command,
    async ({ direction, project, runtime }): Promise<ReaderLinesResult> => {
      const [frame, base] = await Promise.all([
        toAccessibilityFrame(runtime.canvas, project, direction, command.frame),
        runtime.preview.directionUrl(project, direction),
      ]);

      const raw = await probeOnPage<RawReaderProbe>(
        runtime.preview,
        withPagePath(base, frame.page ?? ""),
        { height: frame.viewport.height, width: frame.viewport.width },
        toReaderProbe(READER_LINES_MAX)
      );

      const lines = toReaderLines(raw.nodes);
      const page = toReaderPage(lines, command.cursor, command.limit);

      return { ...page, frame: frame.id, total: lines.length };
    },
    toAccessibilityFailure
  );

export { runReaderLines };

export type { ListReaderLinesCommand, ReaderLinesResult };
