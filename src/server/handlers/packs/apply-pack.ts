import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyPackPacks } from "../../../shared/actions/packs/apply-pack.js";
import { PackStore, PackWriter } from "../../design-system/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type ApplyPackPacksInput = Input<typeof applyPackPacks>;

const handle = Effect.fn("packs.applyPack")(function* run(
  input: ApplyPackPacksInput
) {
  const writer = yield* PackWriter;

  return yield* writer.apply(input);
}) satisfies Handle<typeof applyPackPacks>;

const preview = Effect.fn("packs.applyPack.preview")(function* card(
  input: ApplyPackPacksInput
) {
  const store = yield* PackStore;

  return yield* store.applyCard(input);
}) satisfies Preview<typeof applyPackPacks>;

export { handle, preview };
