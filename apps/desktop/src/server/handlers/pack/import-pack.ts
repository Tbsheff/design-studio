import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { importPackPack } from "../../../shared/actions/pack/import-pack.js";
import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ImportPackPackInput = Input<typeof importPackPack>;

const handle = Effect.fn("pack.importPack")(function* run(
  input: ImportPackPackInput
) {
  const writer = yield* PackWriter;

  return yield* writer.import(input);
}) satisfies Handle<typeof importPackPack>;

export { handle };
