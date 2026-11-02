import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import type {
  Attachment,
  Direction,
  DirectionVariation,
  RunStatus,
  Project,
  RunRequest,
  SessionResetReason,
  Version,
} from "../../shared/contracts.js";
import { withLofi } from "../../shared/lofi.js";
import { levelOf } from "../../shared/run-levels.js";
import {
  isLeanRun,
  leanContext,
  loadRepoContext,
  resolveRunTarget,
} from "../agent/index.js";
import type { FrameStateDeps } from "../canvas/app-flow/frame-state-service.js";
import { createCanvasService } from "../canvas/index.js";
import type { CanvasService } from "../canvas/index.js";
import { recordLayout, stepLayout } from "../canvas/layout-steps.js";
import { previewOrigin } from "../components/props-service.js";
import { REPO_ROOT } from "../config.js";
import { createLiveDrafts } from "../design-system/draft-live.js";
import type { ImproveStarted } from "../design-system/draft-live.js";
import { draftAttachmentIds } from "../design-system/draft-project.js";
import { createFetcher } from "../design-system/extract/draft.js";
import { createPackLibrary } from "../design-system/library.js";
import { applyPack, packRegistry } from "../design-system/packs.js";
import type { LoadedPack, PackRegistry } from "../design-system/packs.js";
import {
  loadDesignSystemPromptContext,
  readDesignSystemState,
} from "../design-system/state.js";
import {
  invalidateTokenSource,
  invalidateTokenSourceOnChange,
} from "../design-system/token-preview.js";
import { createEditHistory } from "../direct-edit/history.js";
import type { EditHistory } from "../direct-edit/history.js";
import { onPlannedEdit } from "../direct-edit/planned-feed.js";
import { recordRunInHistory } from "../direct-edit/run-record.js";
import { resourcePath, resourcesDir } from "../resources.js";
import { createCommandRuleStore } from "../store/command-rules.js";
import { createCommentStore } from "../store/comments.js";
import type { CommentStore } from "../store/comments.js";
import { createDefaultFolderStore } from "../store/default-folder.js";
import type { DefaultFolderStore } from "../store/default-folder.js";
import { BadRequestError, assertSafeId } from "../store/errors.js";
import { createLayerLockStore } from "../store/layer-locks.js";
import type { LayerLockStore } from "../store/layer-locks.js";
import { createKeyedMutex } from "../store/mutex.js";
import type { StudioProjectStore } from "../store/projects.js";
import { createVersionNames } from "../store/version-names.js";
import { createWorkspaceStore } from "../store/workspaces.js";
import type { WorkspaceStore } from "../store/workspaces.js";
import { createThumbnailService } from "../thumbnails.js";
import type { ThumbnailService } from "../thumbnails.js";
import type {
  AgentRunner,
  EventBus,
  PreviewService,
  RunHandle,
  ServerConfig,
  VersionStore,
} from "../types.js";
import { freshSessionPatch } from "./app-project-files.js";
import { readMentionFiles } from "./mentions.js";
import { createFolderPicker } from "./pick-folder.js";
import type { FolderPicker } from "./pick-folder.js";
import { rulesLoader } from "./rules-routes.js";
import type { StreamTracker } from "./stream-routes.js";

const STOP_WAIT_MS = 10_000;

interface AppDeps {
  config: ServerConfig;
  bus: EventBus;
  projects: StudioProjectStore;
  versions: VersionStore;
  runner: AgentRunner;
  preview: PreviewService;
  packs?: PackRegistry;
  uiDir?: string;
  comments?: CommentStore;
  layerLocks?: LayerLockStore;
  workspaces?: WorkspaceStore;
  defaultFolder?: DefaultFolderStore;
  folderPicker?: FolderPicker;
  thumbnails?: ThumbnailService;
  editHistory?: EditHistory;
  canvas?: CanvasService;
  frameStates?: FrameStateDeps;
}

const DEV_UI_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"];
const STREAM_GRACE_MS = 6000;

const createAppContext = (deps: AppDeps) => {
  const { config, bus, projects, versions, runner, preview } = deps;

  const uiDir =
    deps.uiDir ?? resourcePath("ui", path.join(REPO_ROOT, "dist", "ui"));

  const packs =
    deps.packs ??
    packRegistry(undefined, { userDir: path.join(config.dataDir, "packs") });

  const defaultFolder =
    deps.defaultFolder ??
    createDefaultFolderStore(config.dataDir, config.projectsDir);

  const workspaces =
    deps.workspaces ?? createWorkspaceStore(config.dataDir, { defaultFolder });

  const folderPicker = deps.folderPicker ?? createFolderPicker();

  const allowedOrigins = new Set([
    config.studioOrigin,
    ...(resourcesDir() ? [] : DEV_UI_ORIGINS),
  ]);

  const runProjectIndex = new Map<string, string>();
  const directionLock = createKeyedMutex();

  const editHistory =
    deps.editHistory ??
    createEditHistory({
      bus,
      layout: (project, change, kind) =>
        stepLayout(canvas, project, change, kind),
      onRestored: (workTree) => invalidateTokenSource(workTree),
    });

  const editDeps = {
    bus,
    history: editHistory,
    previewOrigin: (project: Project, direction: Direction) =>
      previewOrigin(preview, project, direction),
    projects,
    runner,
    versions,
  };

  onPlannedEdit((edit) =>
    bus.emit(
      edit.kind === "planned"
        ? {
            directionId: edit.directionId,
            id: edit.id,
            patches: edit.patches,
            projectId: edit.projectId,
            type: "edit.planned",
          }
        : {
            directionId: edit.directionId,
            id: edit.id,
            projectId: edit.projectId,
            type: "edit.unplanned",
          }
    )
  );

  const canvas =
    deps.canvas ??
    createCanvasService(bus, (projectId) => projects.projectDir(projectId));

  const frameStates: FrameStateDeps = deps.frameStates ?? {
    bus,
    canvas,
    projectDir: (projectId) => projects.projectDir(projectId),
  };

  canvas.onLayoutChange?.((project, change, source) =>
    recordLayout(editHistory, canvas, project, change, source)
  );

  const announceCanvas = (project: Project): void => {
    void canvas
      .announce(project)
      .catch((error: unknown) =>
        console.error("[http] canvas announce failed", error)
      );
  };

  const announceCanvasAt = async (workTree: string): Promise<void> => {
    const owner = (await projects.list()).find(
      (project) => canvas.ownerOf(project).workTree === workTree
    );

    if (owner) {
      announceCanvas(owner);
    }
  };

  let openStreams = 0;
  let lastStreamEnd = 0;

  const streamTracker: StreamTracker = {
    closed: () => {
      openStreams -= 1;
      lastStreamEnd = Date.now();
    },
    opened: () => {
      openStreams += 1;
    },
  };

  const versionNames = createVersionNames((pid) => projects.projectDir(pid));

  const thumbnails =
    deps.thumbnails ?? createThumbnailService({ preview, projects, versions });

  const projectsRoot = path.join(config.dataDir, "projects");

  const runsDir = (projectId: string): string =>
    path.join(projects.projectDir(projectId), "runs");

  const telemetryFile = (projectId: string): string =>
    path.join(projects.projectDir(projectId), "telemetry.jsonl");

  const appTelemetryFile = path.join(config.dataDir, "telemetry.jsonl");

  const loadDirection = async (
    pid: string,
    did: string
  ): Promise<{ project: Project; direction: Direction }> => {
    const project = await projects.get(pid);

    return {
      direction: projects.directionOf(
        project,
        assertSafeId(did, "directionId")
      ),
      project,
    };
  };

  const withDirection = <T>(
    pid: string,
    did: string,
    task: (project: Project, direction: Direction) => Promise<T>
  ): Promise<T> =>
    directionLock(`${pid}/${did}`, async () => {
      const { project, direction } = await loadDirection(pid, did);

      return task(project, direction);
    });

  const emitStatus = async (
    project: Project,
    direction: Direction
  ): Promise<void> => {
    const status = await versions.status(project, direction);
    bus.emit({
      directionId: direction.id,
      projectId: project.id,
      status,
      type: "status.changed",
    });
  };

  const recordVersion = async (
    project: Project,
    direction: Direction,
    version: Version,
    resetSession?: SessionResetReason
  ): Promise<Direction> => {
    bus.emit({
      directionId: direction.id,
      projectId: project.id,
      type: "version.created",
      version,
    });

    if (resetSession && direction.id === canvas.ownerOf(project).id) {
      announceCanvas(project);
    }
    const patch: Partial<Direction> = resetSession
      ? { headVersionId: version.id, ...freshSessionPatch(resetSession) }
      : { headVersionId: version.id };

    const updated = await projects.updateDirection(
      project.id,
      direction.id,
      patch
    );

    bus.emit({
      direction: updated,
      directionId: direction.id,
      projectId: project.id,
      type: "direction.updated",
    });

    return updated;
  };

  const commitInit = async (
    project: Project,
    title?: string,
    kind: "init" | "manual" = "init"
  ): Promise<Project> => {
    const main = projects.mainDirection(project);

    const version = await versions.commit(
      project,
      main,
      title ??
        (project.imported && !project.imported.created
          ? "Imported"
          : "Starter template"),
      { kind }
    );

    if (version) {
      await recordVersion(project, main, version);
    }
    return projects.get(project.id);
  };

  const applyPackOnCreate = async (
    project: Project,
    pack: LoadedPack,
    designMd: string | undefined
  ): Promise<Project> => {
    await applyPack(project, projects.mainDirection(project).workTree, pack, {
      userDesignMd: designMd,
    });
    await projects.setPackId(project.id, pack.manifest.id);

    return commitInit(
      await projects.get(project.id),
      `Apply ${pack.manifest.name} design system`
    );
  };

  const syncPackId = async (
    project: Project,
    direction: Direction
  ): Promise<void> => {
    if (projects.mainDirection(project).id !== direction.id) {
      return;
    }
    const onDisk = (await readDesignSystemState(project, direction)).manifest;
    const id = onDisk && typeof onDisk.id === "string" ? onDisk.id : null;

    if (id !== (project.packId ?? null)) {
      await projects.setPackId(project.id, id);
    }
  };

  const prepareCreated = async (
    created: Project,
    pack: LoadedPack | null,
    designMd: string | undefined
  ): Promise<Project> => {
    if (!pack && designMd !== undefined && designMd.trim() !== "") {
      await projects.writeDesignMd(created.id, designMd);
    }
    const started =
      created.kind === "react" ? await commitInit(created) : created;

    return pack ? applyPackOnCreate(started, pack, designMd) : started;
  };

  const markLofi = async (
    project: Project,
    direction: Direction,
    request: RunRequest
  ): Promise<void> => {
    if (request.mode !== "edit" || request.task || request.plan) {
      return;
    }
    const on = request.level === "wireframe";
    await canvas
      .update(project, (file) => withLofi(file, direction.id, on), {
        source: "run",
      })
      .catch((error: unknown) =>
        console.error("[http] lo-fi mark failed", error)
      );
  };

  const startRun = async (
    project: Project,
    direction: Direction,
    input: RunRequest
  ): Promise<string> => {
    const request: RunRequest = {
      ...input,
      level: levelOf(input, project.settings),
    };

    const attachments: Attachment[] = await Promise.all(
      (request.attachmentIds ?? []).map((id) =>
        projects.getAttachment(project.id, id)
      )
    );

    const designMd = await projects.readDesignMd(project.id);

    const designSystem = await loadDesignSystemPromptContext(
      direction.workTree,
      project
    ).catch((error: unknown) => {
      console.error("[http] design system load failed", error);

      return null;
    });

    const previewUrl = await preview
      .directionUrl(project, direction)
      .catch((error: unknown) => {
        console.error("[http] preview url failed", error);

        return null;
      });

    const mentionFiles = await readMentionFiles(
      direction.workTree,
      request.mentions
    );

    const target = await resolveRunTarget(
      { canvas, projectDir: (id) => projects.projectDir(id) },
      project,
      direction,
      request.canvas
    ).catch((error: unknown) => {
      console.error("[http] canvas context failed", error);

      return null;
    });

    const designRules = await rulesFor(project, direction).catch(
      (error: unknown) => {
        console.error("[http] design rules load failed", error);

        return [];
      }
    );

    const repoContext = await (
      isLeanRun(request)
        ? leanContext(project, direction.workTree, request.selection)
        : loadRepoContext(project, direction.workTree).then(
            (state) => state.text
          )
    ).catch((error: unknown) => {
      console.error("[http] repo context load failed", error);

      return null;
    });

    await markLofi(project, direction, request);

    const handle = runner.start({
      attachments,
      designMd,
      designRules,
      designSystem,
      direction,
      mentionFiles,
      previewUrl,
      project,
      repoContext,
      request,
      target,
    });

    runProjectIndex.set(handle.runId, project.id);
    void handle.done
      .then((summary) =>
        summary.versionId
          ? recordRunInHistory(
              editHistory,
              versions,
              project,
              direction,
              summary.versionId
            )
          : undefined
      )
      .catch(() => editHistory.clear(project.id, direction.id));

    if (!request.task && !request.variation) {
      void handle.done.then(
        () => continueWithNext(project.id, direction.id, request, handle),
        () => undefined
      );
    }
    return handle.runId;
  };

  const waitForStop = async (pid: string, did: string): Promise<void> => {
    const pending = runner.stopping?.(pid, did);

    if (pending) {
      await Promise.race([
        pending.catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, STOP_WAIT_MS)),
      ]);
    }
  };

  const continueWithNext = async (
    pid: string,
    did: string,
    previous: RunRequest,
    handle: RunHandle
  ): Promise<void> => {
    const next = handle.next?.();

    if (!next) {
      return;
    }
    try {
      const project = await projects.get(pid);

      const direction = project.directions.find(
        (candidate) => candidate.id === did
      );

      if (!direction || runner.isRunning(pid, did)) {
        return;
      }
      await startRun(project, direction, {
        mode: previous.mode,
        prompt: next.text,
        ...(previous.level ? { level: previous.level } : {}),
        ...(previous.effort ? { effort: previous.effort } : {}),
        ...(previous.canvas ? { canvas: previous.canvas } : {}),
      });
    } catch (error) {
      console.error(`[http] could not send the ${next.reason} message`, error);
    }
  };

  const findRunProject = async (runId: string): Promise<string | null> => {
    const known = runProjectIndex.get(runId);

    if (known) {
      return known;
    }
    if (!existsSync(projectsRoot)) {
      return null;
    }
    for (const entry of await readdir(projectsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const base = path.join(projectsRoot, entry.name, "runs", runId);

      if (existsSync(`${base}.json`) || existsSync(`${base}.jsonl`)) {
        runProjectIndex.set(runId, entry.name);

        return entry.name;
      }
    }

    return null;
  };

  const addParentFolder = async (
    parentPath: string | undefined,
    created: Project
  ): Promise<void> => {
    const parent = path.dirname(projects.mainDirection(created).workTree);

    if (
      parentPath !== undefined &&
      parent !== (await defaultFolder.current())
    ) {
      await workspaces
        .add({ path: parent })
        .catch((error: unknown) =>
          console.error("[http] could not save the parent folder", error)
        );
    }
  };

  const watchDirection = (project: Project, direction: Direction): void => {
    try {
      preview.watch(project, direction);
    } catch (error) {
      console.error("[http] watch failed", error);
    }
  };

  const forkDirection = async (
    pid: string,
    input: {
      name: string;
      fromVersionId: string | null;
      variation?: DirectionVariation;
    }
  ): Promise<Direction> => {
    const added = await projects.addDirection(pid, {
      fromVersionId: input.fromVersionId,
      name: input.name,
    });

    const project = await projects.get(pid);
    let direction = added;

    const version = await versions.commit(
      project,
      added,
      `Forked as ${added.name}`,
      { kind: "fork" }
    );

    const extra: Partial<Direction> = input.variation
      ? { variation: input.variation }
      : {};

    if (version) {
      bus.emit({
        directionId: added.id,
        projectId: pid,
        type: "version.created",
        version,
      });
      direction = await projects.updateDirection(pid, added.id, {
        headVersionId: version.id,
        parentVersionId: added.parentVersionId ?? version.parentId,
        ...extra,
      });
    } else if (input.variation) {
      direction = await projects.updateDirection(pid, added.id, extra);
    }

    bus.emit({
      direction,
      directionId: direction.id,
      projectId: pid,
      type: "direction.updated",
    });
    watchDirection(await projects.get(pid), direction);

    return direction;
  };

  const commandRules = createCommandRuleStore(projects.projectDir);

  const withTaskInputs = async (
    project: Project,
    direction: Direction,
    request: RunRequest
  ): Promise<RunRequest> => {
    if (request.task !== "design-system") {
      return request;
    }
    if (!project.designSystemFor) {
      throw new BadRequestError(
        "task design-system works only in a design-system project"
      );
    }
    const exists = (id: string) =>
      projects.getAttachment(project.id, id).then(
        () => true,
        () => false
      );

    const fromDraft = await draftAttachmentIds(direction.workTree, exists);

    const attachmentIds = [
      ...new Set([...(request.attachmentIds ?? []), ...fromDraft]),
    ];

    return attachmentIds.length > 0 ? { ...request, attachmentIds } : request;
  };

  const watchedTokenProjects = new Set<string>();

  const watchTokenSources = (project: Project): void => {
    if (watchedTokenProjects.has(project.id)) {
      return;
    }
    watchedTokenProjects.add(project.id);
    bus.subscribe(project.id, (event) => {
      if (event.type !== "files.changed" || event.directionId === undefined) {
        return;
      }
      const { paths } = event;
      loadDirection(project.id, event.directionId)
        .then(({ direction }) =>
          invalidateTokenSourceOnChange(direction.workTree, paths)
        )
        .catch(() => {});
    });
  };

  const comments = deps.comments ?? createCommentStore(config.dataDir, bus);

  const layerLocks =
    deps.layerLocks ??
    createLayerLockStore({
      bus,
      projectDir: (id) => projects.projectDir(id),
    });
  const rulesFor = rulesLoader(projects.projectDir);

  const commitDesignMd = async (project: Project, direction: Direction) => {
    const version = await versions.commitFile(
      project,
      direction,
      "DESIGN.md",
      "Update design rules",
      { kind: "manual" }
    );

    if (version) {
      await recordVersion(project, direction, version);
    }
    await emitStatus(project, direction);

    return version;
  };

  const library = createPackLibrary(packs);

  const runEnd = (projectId: string) => {
    const early = new Map<string, RunStatus>();
    let settle: ((status: RunStatus) => void) | null = null;
    let target: string | null = null;
    const ended = new Promise<RunStatus>((resolve) => (settle = resolve));

    const finish = (status: RunStatus) => {
      off();
      settle?.(status);
    };

    const off = bus.subscribe(projectId, (event) => {
      if (event.type !== "run.finished") {
        return;
      }
      if (target === null) {
        early.set(event.runId, event.summary.status);
      } else if (event.runId === target) {
        finish(event.summary.status);
      }
    });

    const watch = (runId: string): Promise<RunStatus> => {
      target = runId;
      const done = early.get(runId);

      if (done) {
        finish(done);
      }
      return ended;
    };

    return { stop: off, watch };
  };

  const startDraftImprove = async (
    projectId: string
  ): Promise<ImproveStarted> => {
    const main = projects.mainDirection(await projects.get(projectId));

    return withDirection(projectId, main.id, async (project, direction) => {
      if (runner.isRunning(project.id, direction.id)) {
        return {
          start: {
            state: "skipped",
            reason:
              "Another run was in progress, so the AI step did not start. Use Improve with AI.",
          },
        };
      }
      const level =
        project.settings.defaultLevel === "wireframe"
          ? "prototype"
          : project.settings.defaultLevel;

      const request: RunRequest = {
        level,
        mode: "edit",
        prompt: "Improve this design system.",
        task: "design-system",
      };

      const end = runEnd(project.id);

      try {
        const runId = await startRun(
          project,
          direction,
          await withTaskInputs(project, direction, request)
        );

        return { ended: end.watch(runId), start: { runId, state: "started" } };
      } catch (error) {
        end.stop();
        throw error;
      }
    });
  };

  const withMain = async <T>(
    projectId: string,
    task: (project: Project, direction: Direction) => Promise<T>
  ): Promise<T> =>
    withDirection(
      projectId,
      projects.mainDirection(await projects.get(projectId)).id,
      task
    );

  const liveDrafts = createLiveDrafts({
    commit: (project, title) =>
      withMain(project.id, async (current, direction) => {
        await commitInit(current, title, "manual");
        await emitStatus(current, direction);
      }),
    emit: (project, sources) =>
      bus.emit({
        type: "design-system.sources",
        projectId: project.id,
        directionId: projects.mainDirection(project).id,
        sources,
      }),
    fetcher: createFetcher(config.fetchAllowLoopback === true),
    getProject: (projectId) => projects.get(projectId),
    library,
    mainDirection: (project) => projects.mainDirection(project),
    projectDir: (projectId) => projects.projectDir(projectId),
    saveAttachment: (projectId, file) =>
      projects.saveAttachment(projectId, file),
    startImprove: startDraftImprove,
    withMain,
  });

  const appOpen = (): boolean =>
    openStreams > 0 || Date.now() - lastStreamEnd < STREAM_GRACE_MS;

  return {
    addParentFolder,
    allowedOrigins,
    announceCanvasAt,
    appOpen,
    appTelemetryFile,
    applyPackOnCreate,
    bus,
    canvas,
    commandRules,
    comments,
    commitDesignMd,
    commitInit,
    config,
    defaultFolder,
    directionLock,
    editDeps,
    editHistory,
    emitStatus,
    findRunProject,
    folderPicker,
    forkDirection,
    frameStates,
    layerLocks,
    library,
    liveDrafts,
    loadDirection,
    packs,
    prepareCreated,
    preview,
    projects,
    recordVersion,
    rulesFor,
    runEnd,
    runner,
    runsDir,
    startDraftImprove,
    startRun,
    streamTracker,
    syncPackId,
    telemetryFile,
    thumbnails,
    uiDir,
    versionNames,
    versions,
    waitForStop,
    watchDirection,
    watchTokenSources,
    withDirection,
    withMain,
    withTaskInputs,
    workspaces,
  };
};

type AppContext = ReturnType<typeof createAppContext>;

export { createAppContext };

export type { AppContext, AppDeps };
