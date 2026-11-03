import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { publishDraftPack } from "../../../shared/actions/pack/publish-draft.js";
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
