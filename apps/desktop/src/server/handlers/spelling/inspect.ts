import type { Input } from "@design-studio/actions/_core/action";
import type { inspectSpelling } from "@design-studio/actions/spelling/inspect";
import { Effect } from "effect";

import { toPage } from "../../platform/page/index.js";
import { SpellingStore } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type InspectSpellingInput = Input<typeof inspectSpelling>;

const handle = Effect.fn("spelling.inspect")(function* run(
  input: InspectSpellingInput
) {
  const store = yield* SpellingStore;

  const report = yield* store.inspect({
    directionId: input.directionId,
    frameId: input.frameId,
    projectId: input.projectId,
  });

  const page = toPage(report.hits, input.cursor, input.limit);

  return {
    frameId: report.frameId,
    items: page.items,
    next: page.next,
    total: report.hits.length,
    wordList: { words: report.words },
  };
}) satisfies Handle<typeof inspectSpelling>;

export { handle };
