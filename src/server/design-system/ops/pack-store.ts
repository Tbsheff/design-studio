import { Context, Effect, Layer } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { ApprovalCard } from "../../../shared/actions/_core/approval-card.js";
import type { applyPackPack } from "../../../shared/actions/pack/apply-pack.js";
import type {
  DesignSystemItem,
  DraftStatus,
  PackFile,
} from "../../../shared/actions/pack/schema.js";
import type {
  DesignSystemCheckResult,
  DesignSystemDraftInfo,
  PackDetail,
  PackProblem,
  PackSummary,
} from "../../../shared/contracts.js";
import {
  exportZip,
  listProblems,
  listSummaries,
  toApplyCard,
  toDeleteCard,
  toDraftCard,
} from "./library-cards.js";
import { attemptPacks } from "./library-core.js";
import type { PackError } from "./library-core.js";
import type { DraftInput } from "./library-draft-input.js";
import { listItems, readDraftInfo, readDraftStatus } from "./library-reads.js";

interface PackStoreApi {
  readonly applyCard: (
    input: Input<typeof applyPackPack>
  ) => Effect.Effect<ApprovalCard, PackError>;
  readonly check: (
    packId: string
  ) => Effect.Effect<DesignSystemCheckResult, PackError>;
  readonly deleteCard: (
    packId: string
  ) => Effect.Effect<ApprovalCard, PackError>;
  readonly detail: (packId: string) => Effect.Effect<PackDetail, PackError>;
  readonly draft: (
    projectId: string
  ) => Effect.Effect<DesignSystemDraftInfo, PackError>;
  readonly draftCard: (
    input: DraftInput
  ) => Effect.Effect<ApprovalCard, PackError>;
  readonly draftStatus: (
    projectId: string
  ) => Effect.Effect<DraftStatus, PackError>;
  readonly exportZip: (packId: string) => Effect.Effect<PackFile, PackError>;
  readonly list: (
    isDraftShown: boolean
  ) => Effect.Effect<DesignSystemItem[], PackError>;
  readonly problems: () => Effect.Effect<PackProblem[], PackError>;
  readonly summaries: () => Effect.Effect<PackSummary[], PackError>;
}

class PackStore extends Context.Service<PackStore, PackStoreApi>()(
  "design-studio/design-system/PackStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PackStore,
    PackStore.of({
      applyCard: Effect.fn("PackStore.applyCard")(function* run(
        input: Input<typeof applyPackPack>
      ) {
        return yield* attemptPacks((runtime) => toApplyCard(runtime, input));
      }),
      check: Effect.fn("PackStore.check")(function* run(packId: string) {
        return yield* attemptPacks((runtime) =>
          runtime.library.checkPack(packId)
        );
      }),
      deleteCard: Effect.fn("PackStore.deleteCard")(function* run(
        packId: string
      ) {
        return yield* attemptPacks((runtime) => toDeleteCard(runtime, packId));
      }),
      detail: Effect.fn("PackStore.detail")(function* run(packId: string) {
        return yield* attemptPacks((runtime) => runtime.library.detail(packId));
      }),
      draft: Effect.fn("PackStore.draft")(function* run(projectId: string) {
        return yield* attemptPacks((runtime) =>
          readDraftInfo(runtime, projectId)
        );
      }),
      draftCard: Effect.fn("PackStore.draftCard")(function* run(
        input: DraftInput
      ) {
        return yield* attemptPacks(() => Promise.resolve(toDraftCard(input)));
      }),
      draftStatus: Effect.fn("PackStore.draftStatus")(function* run(
        projectId: string
      ) {
        return yield* attemptPacks((runtime) =>
          readDraftStatus(runtime, projectId)
        );
      }),
      exportZip: Effect.fn("PackStore.exportZip")(function* run(
        packId: string
      ) {
        return yield* attemptPacks((runtime) => exportZip(runtime, packId));
      }),
      list: Effect.fn("PackStore.list")(function* run(isDraftShown: boolean) {
        return yield* attemptPacks((runtime) =>
          listItems(runtime, isDraftShown)
        );
      }),
      problems: Effect.fn("PackStore.problems")(function* run() {
        return yield* attemptPacks((runtime) => listProblems(runtime));
      }),
      summaries: Effect.fn("PackStore.summaries")(function* run() {
        return yield* attemptPacks((runtime) => listSummaries(runtime));
      }),
    })
  );
}

export { PackStore };

export type { PackStoreApi };
