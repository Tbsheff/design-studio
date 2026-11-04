import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deletePackPack } from "../../../shared/actions/pack/delete-pack.js";
import { PackStore, PackWriter } from "../../design-system/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeletePackPackInput = Input<typeof deletePackPack>;

const handle = Effect.fn("pack.deletePack")(function* run(
  input: DeletePackPackInput
) {
  const writer = yield* PackWriter;

  return yield* writer.delete(input.packId);
}) satisfies Handle<typeof deletePackPack>;

const preview = Effect.fn("pack.deletePack.preview")(function* card(
  input: DeletePackPackInput
) {
  const store = yield* PackStore;

  return yield* store.deleteCard(input.packId);
}) satisfies Preview<typeof deletePackPack>;

export { handle, preview };
