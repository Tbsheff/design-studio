import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deletePackPacks } from "../../../shared/actions/packs/delete-pack.js";
import { PackStore } from "../../design-system/ops/pack-store.js";
import { PackWriter } from "../../design-system/ops/pack-writer.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeletePackPacksInput = Input<typeof deletePackPacks>;

const handle = Effect.fn("packs.deletePack")(function* run(
  input: DeletePackPacksInput
) {
  const writer = yield* PackWriter;

  return yield* writer.delete(input.packId);
}) satisfies Handle<typeof deletePackPacks>;

const preview = Effect.fn("packs.deletePack.preview")(function* card(
  input: DeletePackPacksInput
) {
  const store = yield* PackStore;

  return yield* store.deleteCard(input.packId);
}) satisfies Preview<typeof deletePackPacks>;

export { handle, preview };
