import type { Input } from "@design-studio/actions/_core/action";
import type { startEditorPack } from "@design-studio/actions/pack/start-editor";
import { Effect } from "effect";

import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type StartEditorPackInput = Input<typeof startEditorPack>;

const handle = Effect.fn("pack.startEditor")(function* run(
  input: StartEditorPackInput
) {
  const writer = yield* PackWriter;

  return yield* writer.openEditor(input.packId);
}) satisfies Handle<typeof startEditorPack>;

export { handle };
