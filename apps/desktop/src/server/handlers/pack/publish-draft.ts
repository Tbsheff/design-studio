import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { publishDraftPack } from "@design-studio/actions/pack/publish-draft";
import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type PublishDraftPackInput = Input<typeof publishDraftPack>;

const handle = Effect.fn("pack.publishDraft")(function* run(
  input: PublishDraftPackInput
) {
  const writer = yield* PackWriter;

  return yield* writer.publishDraft(input);
}) satisfies Handle<typeof publishDraftPack>;

export { handle };
