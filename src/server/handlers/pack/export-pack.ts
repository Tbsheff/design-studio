import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { exportPackPack } from "../../../shared/actions/pack/export-pack.js";
import { PackStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ExportPackPackInput = Input<typeof exportPackPack>;

const handle = Effect.fn("pack.exportPack")(function* run(
  input: ExportPackPackInput
) {
  const store = yield* PackStore;

  return yield* store.exportZip(input.packId);
}) satisfies Handle<typeof exportPackPack>;

export { handle };
