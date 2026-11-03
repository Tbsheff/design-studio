import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { publishDraftPacks } from "../../../shared/actions/packs/publish-draft.js";
import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type PublishDraftPacksInput = Input<typeof publishDraftPacks>;

const handle = Effect.fn("packs.publishDraft")(function* run(
  input: PublishDraftPacksInput
) {
  const writer = yield* PackWriter;

  return yield* writer.publishDraft(input);
}) satisfies Handle<typeof publishDraftPacks>;

export { handle };
