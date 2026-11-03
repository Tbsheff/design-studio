import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyPackPack } from "../../../shared/actions/pack/apply-pack.js";
import type { createPackPack } from "../../../shared/actions/pack/create-pack.js";
import type { importPackPack } from "../../../shared/actions/pack/import-pack.js";
import type { publishDraftPack } from "../../../shared/actions/pack/publish-draft.js";
import type { PublishedDraft } from "../../../shared/actions/pack/schema.js";
import type { setPackPack } from "../../../shared/actions/pack/set-pack.js";
import type { updatePackPack } from "../../../shared/actions/pack/update-pack.js";
import type {
  ApplyPackResult,
  DesignSystemCheckResult,
  ImportPackResult,
  PackSummary,
  SavePackResult,
} from "../../../shared/contracts.js";
import { BadRequestError, ConflictError } from "../../store/errors.js";
import { MAX_IMPORT_ZIP_BYTES, parseImportMode } from "../pack-import.js";
import { applyPackToDirection, saveDirectionPack } from "../project-pack.js";
import type { PackWriteRuntime } from "./library-core.js";
import { readDraftInfo } from "./library-reads.js";

type ApplyInput = Input<typeof applyPackPack>;

type ImportInput = Input<typeof importPackPack>;

type PublishInput = Input<typeof publishDraftPack>;

type SaveInput = Input<typeof setPackPack>;

type CreateInput = Input<typeof createPackPack>;

type UpdatePatch = Omit<Input<typeof updatePackPack>, "packId">;

const ATTACHED_APP =
  "An attached app keeps its own design system in its code. Applying a studio pack would overwrite files in your repository.";

const SOURCES_PENDING =
  "The studio is still reading the sources of this draft. Call design_system_status until sources.done is true.";

const RUN_ACTIVE =
  "A studio run is active on this project. Wait for it to finish, then try again.";

const createPack = async (
  runtime: PackWriteRuntime,
  fields: CreateInput
): Promise<PackSummary> => {
  const pack = await runtime.library.createUserPack(fields);

  return pack.summary;
};

const updatePack = async (
  runtime: PackWriteRuntime,
  packId: string,
  patch: UpdatePatch
): Promise<PackSummary> => {
  const pack = await runtime.library.updateUserPack(packId, patch);

  return pack.summary;
};

const duplicatePack = async (
  runtime: PackWriteRuntime,
  packId: string,
  name: string | null
): Promise<PackSummary> => {
  if (name === null) {
    const copy = await runtime.library.duplicatePack(packId);

    return copy.summary;
  }

  const copy = await runtime.library.duplicatePack(packId, name);

  return copy.summary;
};

const deletePack = async (
  runtime: PackWriteRuntime,
  packId: string
): Promise<{ ok: true }> => {
  await runtime.library.deletePack(packId);
  await runtime.edits.onDeleted(packId);

  return { ok: true };
};

const importPack = async (
  runtime: PackWriteRuntime,
  input: ImportInput
): Promise<ImportPackResult> => {
  const bytes = Buffer.from(input.content, "base64");

  if (bytes.byteLength > MAX_IMPORT_ZIP_BYTES) {
    throw new BadRequestError("the zip is larger than 2 MB");
  }

  const { pack, replaced } = await runtime.library.importPack(
    bytes,
    parseImportMode(input.mode ?? "ask")
  );

  return { pack: pack.summary, replaced };
};

const applyPack = async (
  runtime: PackWriteRuntime,
  input: ApplyInput
): Promise<ApplyPackResult> => {
  const pack = await runtime.library.registry.get(input.packId);

  if (!pack) {
    throw new BadRequestError(`unknown packId: ${input.packId}`);
  }

  return runtime.edits.withDirection(
    input.projectId,
    input.directionId,
    (project, direction) => {
      if (project.app) {
        throw new BadRequestError(ATTACHED_APP);
      }

      return applyPackToDirection(
        runtime.edits.editDeps,
        project,
        direction,
        pack
      );
    }
  );
};

const setPack = (
  runtime: PackWriteRuntime,
  input: SaveInput
): Promise<SavePackResult> => {
  const { directionId, projectId, ...body } = input;

  return runtime.edits.withDirection(
    projectId,
    directionId,
    (project, direction) =>
      saveDirectionPack(
        runtime.edits.editDeps,
        runtime.library,
        project,
        direction,
        body
      )
  );
};

const findPack = async (
  runtime: PackWriteRuntime,
  packId: string
): Promise<PackSummary | null> => {
  const packs = await runtime.library.registry.list();

  return packs.find((item) => item.id === packId) ?? null;
};

const checkPublish = (
  input: PublishInput,
  sourcesDone: boolean,
  check: DesignSystemCheckResult
): void => {
  if (input.force === true && !input.reason) {
    throw new BadRequestError("force needs a reason");
  }

  if (!sourcesDone) {
    throw new BadRequestError(SOURCES_PENDING);
  }

  if (!check.passed && input.force !== true) {
    throw new BadRequestError(
      `The design system check found ${String(check.problems.length)} problem(s). Fix them (design_system_status lists them), or pass force: true with a reason.`
    );
  }
};

const publishDraft = async (
  runtime: PackWriteRuntime,
  input: PublishInput
): Promise<PublishedDraft> => {
  const project = await runtime.projects.get(input.projectId);
  const direction = runtime.projects.mainDirection(project);

  if (runtime.runner.isRunning(project.id, direction.id)) {
    throw new ConflictError(RUN_ACTIVE);
  }

  const info = await readDraftInfo(runtime, project.id);

  checkPublish(input, info.sources?.done !== false, info.check);

  const pack = await findPack(runtime, info.packId);
  const libraryName = input.name ?? pack?.name ?? project.name;

  const request = {
    directionId: direction.id,
    force: input.force === true,
    name: libraryName,
    packId: info.packId,
    projectId: project.id,
  } as SaveInput;

  const saved = await setPack(runtime, request);

  return {
    checkPassed: info.check.passed,
    created: saved.created,
    name: saved.pack.name,
    packId: saved.pack.id,
    versionId: saved.version?.id ?? null,
  };
};

export {
  applyPack,
  createPack,
  deletePack,
  duplicatePack,
  importPack,
  publishDraft,
  setPack,
  updatePack,
};
