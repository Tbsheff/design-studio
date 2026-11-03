import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { startEditorPacks } from "../../../shared/actions/packs/start-editor.js";
import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type StartEditorPacksInput = Input<typeof startEditorPacks>;

const handle = Effect.fn("packs.startEditor")(function* run(
  input: StartEditorPacksInput
) {
  const writer = yield* PackWriter;

  return yield* writer.openEditor(input.packId);
}) satisfies Handle<typeof startEditorPacks>;

export { handle };
