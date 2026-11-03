import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { exportPackPacks } from "../../../shared/actions/packs/export-pack.js";
import { PackStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ExportPackPacksInput = Input<typeof exportPackPacks>;

const handle = Effect.fn("packs.exportPack")(function* run(
  input: ExportPackPacksInput
) {
  const store = yield* PackStore;

  return yield* store.exportZip(input.packId);
}) satisfies Handle<typeof exportPackPacks>;

export { handle };
