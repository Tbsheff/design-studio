import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deletePublish } from "../../../shared/actions/publish/delete.js";
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
