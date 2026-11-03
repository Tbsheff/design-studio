import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listPublish } from "../../../shared/actions/publish/list.js";
import type { Publication } from "../../../shared/publish.js";
import {
  PublishStore,
  findCloudOrg,
  listCloudPublications,
} from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type ListPublishInput = Input<typeof listPublish>;

const markLegacy = (item: Publication): Publication => {
  item.isLegacy = true;

  return item;
};

const handle = Effect.fn("publish.list")(function* run(
  input: ListPublishInput
) {
  const store = yield* PublishStore;
  const local = yield* store.list(input.projectId);
  const orgId = yield* findCloudOrg(input.projectId);

  if (orgId === null) {
    return local;
  }

  const cloud = yield* listCloudPublications(orgId, input.projectId);

  return {
    ...local,
    publications: [...cloud, ...local.publications.map(markLegacy)],
  };
}) satisfies Handle<typeof listPublish>;

export { handle };
