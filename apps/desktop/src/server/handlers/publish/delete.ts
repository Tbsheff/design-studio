import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { deletePublish } from "@design-studio/actions/publish/delete";
import { PublishService } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type DeletePublishInput = Input<typeof deletePublish>;

const handle = Effect.fn("publish.delete")(function* run(
  _input: DeletePublishInput
) {
  const service = yield* PublishService;

  return yield* service.logout();
}) satisfies Handle<typeof deletePublish>;

export { handle };
