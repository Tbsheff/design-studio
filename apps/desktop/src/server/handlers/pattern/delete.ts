import type { Input } from "@design-studio/actions/_core/action";
import type { deletePattern } from "@design-studio/actions/pattern/delete";
import { Effect } from "effect";

import { PatternStore, PatternWriter } from "../../share/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeletePatternInput = Input<typeof deletePattern>;

const handle = Effect.fn("pattern.delete")(function* run(
  input: DeletePatternInput
) {
  const writer = yield* PatternWriter;

  return yield* writer.delete(input.patternId);
}) satisfies Handle<typeof deletePattern>;

const preview = Effect.fn("pattern.delete.preview")(function* card(
  input: DeletePatternInput
) {
  const store = yield* PatternStore;
  const stored = yield* store.get(input.patternId);

  return {
    action: "Delete a saved pattern",
    detail: `Removes the saved pattern ${stored.name} (${stored.kind}, ${stored.imports.length} imports, ${stored.tokens.length} tokens) from the studio. Projects that used it keep their code.`,
    title: `Delete the pattern ${stored.name}`,
  };
}) satisfies Preview<typeof deletePattern>;

export { handle, preview };
