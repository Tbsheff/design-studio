import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyPackPack } from "../../../shared/actions/pack/apply-pack.js";
import { PackStore, PackWriter } from "../../design-system/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type ApplyPackPackInput = Input<typeof applyPackPack>;

const handle = Effect.fn("pack.applyPack")(function* run(
  input: ApplyPackPackInput
) {
  const writer = yield* PackWriter;

  return yield* writer.apply(input);
}) satisfies Handle<typeof applyPackPack>;

const preview = Effect.fn("pack.applyPack.preview")(function* card(
  input: ApplyPackPackInput
) {
  const store = yield* PackStore;

  return yield* store.applyCard(input);
}) satisfies Preview<typeof applyPackPack>;

export { handle, preview };
