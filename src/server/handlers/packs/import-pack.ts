import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { importPackPacks } from "../../../shared/actions/packs/import-pack.js";
import { PackWriter } from "../../design-system/ops/pack-writer.js";
import type { Handle } from "../_core/handler.js";

type ImportPackPacksInput = Input<typeof importPackPacks>;

const handle = Effect.fn("packs.importPack")(function* run(
  input: ImportPackPacksInput
) {
  const writer = yield* PackWriter;

  return yield* writer.import(input);
}) satisfies Handle<typeof importPackPacks>;

export { handle };
