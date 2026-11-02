import { Context, Effect, Layer } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyPackPacks } from "../../../shared/actions/packs/apply-pack.js";
import type { createPackPacks } from "../../../shared/actions/packs/create-pack.js";
import type { importPackPacks } from "../../../shared/actions/packs/import-pack.js";
import type { publishDraftPacks } from "../../../shared/actions/packs/publish-draft.js";
import type {
  DraftResult,
  PublishedDraft,
} from "../../../shared/actions/packs/schema.js";
import type { setPackPacks } from "../../../shared/actions/packs/set-pack.js";
import type { updatePackPacks } from "../../../shared/actions/packs/update-pack.js";
import type {
  ApplyPackResult,
  ImportPackResult,
  OpenPackEditorResult,
  PackSummary,
  SavePackResult,
} from "../../../shared/contracts.js";
import { attemptPackWrites } from "./library-core.js";
import type { PackWriteError } from "./library-core.js";
import type { DraftInput } from "./library-draft-input.js";
import { createDraft, openEditor } from "./library-drafts.js";
import {
  applyPack,
  createPack,
  deletePack,
  duplicatePack,
  importPack,
  publishDraft,
  setPack,
  updatePack,
} from "./library-writes.js";

type PackFields = Input<typeof createPackPacks>;

type PackPatch = Omit<Input<typeof updatePackPacks>, "packId">;

interface PackWriterApi {
  readonly apply: (
    input: Input<typeof applyPackPacks>
  ) => Effect.Effect<ApplyPackResult, PackWriteError>;
  readonly create: (
    fields: PackFields
  ) => Effect.Effect<PackSummary, PackWriteError>;
  readonly createDraft: (
    input: DraftInput
  ) => Effect.Effect<DraftResult, PackWriteError>;
  readonly delete: (
    packId: string
  ) => Effect.Effect<{ ok: true }, PackWriteError>;
  readonly duplicate: (
    packId: string,
    name: string | null
  ) => Effect.Effect<PackSummary, PackWriteError>;
  readonly import: (
    input: Input<typeof importPackPacks>
  ) => Effect.Effect<ImportPackResult, PackWriteError>;
  readonly openEditor: (
    packId: string
  ) => Effect.Effect<OpenPackEditorResult, PackWriteError>;
  readonly publishDraft: (
    input: Input<typeof publishDraftPacks>
  ) => Effect.Effect<PublishedDraft, PackWriteError>;
  readonly save: (
    input: Input<typeof setPackPacks>
  ) => Effect.Effect<SavePackResult, PackWriteError>;
  readonly update: (
    packId: string,
    patch: PackPatch
  ) => Effect.Effect<PackSummary, PackWriteError>;
}

class PackWriter extends Context.Service<PackWriter, PackWriterApi>()(
  "design-studio/packs/PackWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    PackWriter,
    PackWriter.of({
      apply: Effect.fn("PackWriter.apply")(function* run(
        input: Input<typeof applyPackPacks>
      ) {
        return yield* attemptPackWrites((runtime) => applyPack(runtime, input));
      }),
      create: Effect.fn("PackWriter.create")(function* run(fields: PackFields) {
        return yield* attemptPackWrites((runtime) =>
          createPack(runtime, fields)
        );
      }),
      createDraft: Effect.fn("PackWriter.createDraft")(function* run(
        input: DraftInput
      ) {
        return yield* attemptPackWrites((runtime) =>
          createDraft(runtime, input)
        );
      }),
      delete: Effect.fn("PackWriter.delete")(function* run(packId: string) {
        return yield* attemptPackWrites((runtime) =>
          deletePack(runtime, packId)
        );
      }),
      duplicate: Effect.fn("PackWriter.duplicate")(function* run(
        packId: string,
        name: string | null
      ) {
        return yield* attemptPackWrites((runtime) =>
          duplicatePack(runtime, packId, name)
        );
      }),
      import: Effect.fn("PackWriter.import")(function* run(
        input: Input<typeof importPackPacks>
      ) {
        return yield* attemptPackWrites((runtime) =>
          importPack(runtime, input)
        );
      }),
      openEditor: Effect.fn("PackWriter.openEditor")(function* run(
        packId: string
      ) {
        return yield* attemptPackWrites((runtime) =>
          openEditor(runtime, packId)
        );
      }),
      publishDraft: Effect.fn("PackWriter.publishDraft")(function* run(
        input: Input<typeof publishDraftPacks>
      ) {
        return yield* attemptPackWrites((runtime) =>
          publishDraft(runtime, input)
        );
      }),
      save: Effect.fn("PackWriter.save")(function* run(
        input: Input<typeof setPackPacks>
      ) {
        return yield* attemptPackWrites((runtime) => setPack(runtime, input));
      }),
      update: Effect.fn("PackWriter.update")(function* run(
        packId: string,
        patch: PackPatch
      ) {
        return yield* attemptPackWrites((runtime) =>
          updatePack(runtime, packId, patch)
        );
      }),
    })
  );
}

export { PackWriter };

export type { PackWriterApi };
