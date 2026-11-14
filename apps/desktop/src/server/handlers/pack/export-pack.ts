import type { Input } from "@design-studio/actions/_core/action";
import type { exportPackPack } from "@design-studio/actions/pack/export-pack";
import { Effect } from "effect";

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
