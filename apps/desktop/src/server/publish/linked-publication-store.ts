import { Context, Effect, Layer } from "effect";

import type { PublicationList } from "../../shared/actions/publish/schema.js";
import { CloudListClient } from "../cloud/index.js";
import type { CloudFailure } from "../cloud/index.js";
import { DeviceBindings } from "../store/index.js";
import { PublishStore } from "./publish-store.js";

interface LinkedPublicationStoreApi {
  readonly list: (
    projectId: string
  ) => Effect.Effect<PublicationList, CloudFailure>;
}

type ListedPublication = PublicationList["publications"][number];

const toLegacy = (item: ListedPublication): ListedPublication => ({
  ...item,
  isLegacy: true,
});

class LinkedPublicationStore extends Context.Service<
  LinkedPublicationStore,
  LinkedPublicationStoreApi
>()("design-studio/publish/LinkedPublicationStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    LinkedPublicationStore,
    Effect.gen(function* make() {
      const bindings = yield* DeviceBindings;
      const cloud = yield* CloudListClient;
      const store = yield* PublishStore;

      return LinkedPublicationStore.of({
        list: Effect.fn("LinkedPublicationStore.list")(function* run(
          projectId: string
        ) {
          const local = yield* store.list(projectId);
          const orgId = yield* bindings.getOrgOfProject(projectId);

          if (orgId === null) {
            return local;
          }

          const linked = yield* cloud.listPublications(orgId, projectId);

          return {
            ...local,
            publications: [...linked, ...local.publications.map(toLegacy)],
          };
        }),
      });
    })
  );
}

export { LinkedPublicationStore };

export type { LinkedPublicationStoreApi };
