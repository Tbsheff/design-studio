import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { importPackPack } from "@design-studio/actions/pack/import-pack";
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
