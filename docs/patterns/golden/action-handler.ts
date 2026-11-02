import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { unpublish } from "../../../shared/actions/publish/unpublish.js";
import { Publications } from "../../publish/publications.js";
import { PublishStore } from "../../publish/publish-store.js";
import type { Handle, Preview } from "../_core/handler.js";

type UnpublishInput = Input<typeof unpublish>;

const handle = Effect.fn("publish.unpublish")(function* run(
  input: UnpublishInput
) {
  const publications = yield* Publications;
  const publication = yield* publications.unpublish(input);

  return { publication };
}) satisfies Handle<typeof unpublish>;

const preview = Effect.fn("publish.unpublish.preview")(function* card(
  input: UnpublishInput
) {
  const store = yield* PublishStore;
  const found = yield* store.lookup(input.projectId, input.publicationId);

  return {
    action: "Unpublish",
    detail: found?.url ?? input.publicationId,
    title: "Take this site off the internet?",
  };
}) satisfies Preview<typeof unpublish>;

export { handle, preview };
