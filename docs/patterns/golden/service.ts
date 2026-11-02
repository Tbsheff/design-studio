import { Context, Effect, Layer, Semaphore } from "effect";

import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { CfFailed } from "../../shared/actions/publish/errors/cf-failed.js";
import type { Publication } from "../../shared/actions/publish/schema.js";
import { CfCli } from "./cf-cli.js";
import { PublishStore } from "./publish-store.js";

interface PublicationRef {
  readonly projectId: string;
  readonly publicationId: string;
}

interface PublicationsApi {
  readonly unpublish: (
    ref: PublicationRef
  ) => Effect.Effect<Publication, CfFailed | NotFound>;
}

class Publications extends Context.Service<Publications, PublicationsApi>()(
  "design-studio/publish/Publications"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    Publications,
    Effect.gen(function* make() {
      const store = yield* PublishStore;
      const cf = yield* CfCli;
      const lock = yield* Semaphore.make(1);

      const remove = Effect.fn("Publications.unpublish")(function* run(
        ref: PublicationRef
      ) {
        const found = yield* store.lookup(ref.projectId, ref.publicationId);

        if (found === null) {
          return yield* new NotFound({ message: "No such publication." });
        }

        yield* cf.deleteWorker(found.id);
        yield* store.remove(ref.projectId, found.id);

        return found;
      });

      return Publications.of({
        unpublish: (ref) => lock.withPermit(remove(ref)),
      });
    })
  );
}

export { Publications };

export type { PublicationRef };
