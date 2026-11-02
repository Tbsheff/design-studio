import { Context, Effect, Layer } from "effect";

import type {
  DesignSystemItem,
  DraftStatus,
} from "../../../shared/actions/packs/schema.js";
import type {
  DesignSystemCheckResult,
  DesignSystemDraftInfo,
  PackDetail,
} from "../../../shared/contracts.js";
import { attemptPacks } from "./library-core.js";
import type { PackError } from "./library-core.js";
import { listItems, readDraftInfo, readDraftStatus } from "./library-reads.js";

interface PackStoreApi {
  readonly check: (
    packId: string
  ) => Effect.Effect<DesignSystemCheckResult, PackError>;
  readonly detail: (packId: string) => Effect.Effect<PackDetail, PackError>;
  readonly draft: (
    projectId: string
  ) => Effect.Effect<DesignSystemDraftInfo, PackError>;
  readonly draftStatus: (
    projectId: string
  ) => Effect.Effect<DraftStatus, PackError>;
  readonly list: (
    isDraftShown: boolean
  ) => Effect.Effect<DesignSystemItem[], PackError>;
}

class PackStore extends Context.Service<PackStore, PackStoreApi>()(
  "design-studio/packs/PackStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PackStore,
    PackStore.of({
      check: Effect.fn("PackStore.check")(function* run(packId: string) {
        return yield* attemptPacks((runtime) =>
          runtime.library.checkPack(packId)
        );
      }),
      detail: Effect.fn("PackStore.detail")(function* run(packId: string) {
        return yield* attemptPacks((runtime) => runtime.library.detail(packId));
      }),
      draft: Effect.fn("PackStore.draft")(function* run(projectId: string) {
        return yield* attemptPacks((runtime) =>
          readDraftInfo(runtime, projectId)
        );
      }),
      draftStatus: Effect.fn("PackStore.draftStatus")(function* run(
        projectId: string
      ) {
        return yield* attemptPacks((runtime) =>
          readDraftStatus(runtime, projectId)
        );
      }),
      list: Effect.fn("PackStore.list")(function* run(isDraftShown: boolean) {
        return yield* attemptPacks((runtime) =>
          listItems(runtime, isDraftShown)
        );
      }),
    })
  );
}

export { PackStore };

export type { PackStoreApi };
