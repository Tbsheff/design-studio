import type { DraftResult } from "../../../shared/actions/pack/schema.js";
import type {
  DesignSystemDraftResult,
  OpenPackEditorResult,
  Project,
} from "../../../shared/contracts.js";
import { BadRequestError, NotFoundError } from "../../store/errors.js";
import { createKeyedMutex } from "../../store/mutex.js";
import { IMPROVE_IN_APP } from "../draft-live.js";
import type { LiveDrafts } from "../draft-live.js";
import {
  assembleDraft,
  buildDraft,
  checkDraftUrls,
  draftBase,
  emptyHarvested,
  parseDraftRequest,
} from "../extract/draft.js";
import type { Draft, DraftRequest } from "../extract/draft.js";
import { KIT_GROUPS } from "../extract/kit-page.js";
import {
  createBacking,
  createPackBacking,
  toLibrarySource,
} from "./library-backing.js";
import type { BackingSource, ImageInput } from "./library-backing.js";
import type { PackWriteRuntime } from "./library-core.js";
import { toDraftRaw, toImages } from "./library-draft-input.js";
import type { DraftInput } from "./library-draft-input.js";

interface DraftStart {
  readonly images: readonly ImageInput[];
  readonly isImproved: boolean;
  readonly request: DraftRequest;
  readonly started: number;
}

const NEXT_STEP =
  "Call design_system_status with this projectId until sources.done is true.";

const editorLock = createKeyedMutex();

const toSource = (
  draft: Pick<Draft, "files" | "inputs" | "kitHtml" | "name">
): BackingSource => ({
  files: draft.files,
  inputs: draft.inputs,
  kitHtml: draft.kitHtml,
  name: draft.name,
});

const createLive = async (
  runtime: PackWriteRuntime,
  live: LiveDrafts,
  start: DraftStart
): Promise<DesignSystemDraftResult> => {
  const { library } = runtime;

  checkDraftUrls(start.request, runtime.drafts.allowLoopback);

  const basePack = await draftBase(library.registry, start.request);

  const draft = assembleDraft(
    start.request,
    basePack,
    emptyHarvested(),
    KIT_GROUPS
  );

  const pack = await library.createUserPack(draft.pack);

  const backing = await createPackBacking(
    runtime,
    toSource(draft),
    pack,
    start.images
  );

  live.start({
    autoImprove: start.isImproved,
    base: basePack,
    imageCount: start.images.length,
    packId: pack.manifest.id,
    project: backing,
    request: start.request,
  });

  return {
    coverage: draft.coverage,
    ms: Date.now() - start.started,
    pack: pack.summary,
    project: backing,
  };
};

const createBuilt = async (
  runtime: PackWriteRuntime,
  start: DraftStart
): Promise<DesignSystemDraftResult> => {
  const { library } = runtime;

  const draft = await buildDraft(
    start.request,
    { fetcher: runtime.drafts.fetcher, registry: library.registry },
    {
      allowLoopback: runtime.drafts.allowLoopback,
      imageCount: start.images.length,
    }
  );

  const pack = await library.createUserPack(draft.pack);

  const project = await createPackBacking(
    runtime,
    toSource(draft),
    pack,
    start.images
  );

  return {
    coverage: draft.coverage,
    ms: Date.now() - start.started,
    pack: pack.summary,
    project,
  };
};

const mainIdOf = (project: Project): string | null =>
  (
    project.directions.find((direction) => direction.id === "main") ??
    project.directions[0] ??
    null
  )?.id ?? null;

const toDraftResult = (result: DesignSystemDraftResult): DraftResult => ({
  coverage: result.coverage,
  directionId: mainIdOf(result.project),
  grade: result.coverage.grade,
  improve: IMPROVE_IN_APP,
  ms: result.ms,
  name: result.pack.name,
  next: NEXT_STEP,
  pack: result.pack,
  packId: result.pack.id,
  project: result.project,
  projectId: result.project.id,
});

const createDraft = async (
  runtime: PackWriteRuntime,
  input: DraftInput
): Promise<DraftResult> => {
  const started = Date.now();
  const images = toImages(input.images ?? []);
  const isImproved = input.improve === true;
  const raw = await toDraftRaw(input, runtime.dataDir);
  const request = parseDraftRequest(raw, images.length);
  const start: DraftStart = { images, isImproved, request, started };

  if (runtime.live) {
    return toDraftResult(await createLive(runtime, runtime.live, start));
  }

  return toDraftResult(await createBuilt(runtime, start));
};

const openEditor = async (
  runtime: PackWriteRuntime,
  packId: string
): Promise<OpenPackEditorResult> => {
  const pack = await runtime.library.registry.get(packId);

  if (!pack) {
    throw new NotFoundError(`unknown pack: ${packId}`);
  }

  if (pack.source !== "user") {
    throw new BadRequestError(
      `${pack.manifest.name} is a built-in design system; make a copy to edit it`
    );
  }

  return editorLock(packId, async () => {
    const projects = await runtime.projects.list();

    const existing = projects.find(
      (project) =>
        project.designSystemFor === packId && !project.designSystemDeleted
    );

    if (existing) {
      return { created: false, project: existing };
    }

    return {
      created: true,
      project: await createBacking(runtime, toLibrarySource(pack), pack, []),
    };
  });
};

export { createDraft, openEditor };
