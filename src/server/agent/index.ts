import path from "node:path";

import { TOKENS_FILE } from "../../shared/contracts.js";
import type { Direction, Project } from "../../shared/contracts.js";
import type { FrameStateDeps } from "../canvas/app-flow/frame-state-service.js";
import type { CanvasService } from "../canvas/service.js";
import { refreshDraftCoverage } from "../design-system/draft-project.js";
import { packRegistry, type PackRegistry } from "../design-system/packs.js";
import { buildErrorMessage, syncDesignSystem } from "../design-system/sync.js";
import type { StudioRuntime } from "../main/runtime.js";
import type { CommentStore } from "../store/comments.js";
import type { LayerLockStore } from "../store/layer-locks.js";
import type {
  AgentRunner,
  EventBus,
  PreviewService,
  ProjectStore,
  ServerConfig,
  VersionStore,
} from "../types.js";
import { createRunLifecycle } from "./lifecycle.js";
import type { RunDriver } from "./lifecycle.js";
import type { RunFibers } from "./run-runner.js";
import type { SdkDriverOptions } from "./sdk-driver.js";
import type { DevicePolicySource } from "./types.js";

interface AgentRunnerDeps {
  config: ServerConfig;
  bus: EventBus;
  projects: ProjectStore;
  versions: VersionStore;
  preview: PreviewService;
  canvas?: CanvasService;
  comments?: CommentStore;
  layerLocks?: LayerLockStore | null;
  frameStates?: FrameStateDeps | null;
  runtime?: StudioRuntime | null;
  devicePolicy?: DevicePolicySource;
}

function claudeExecutableOption(): { claudeExecutable?: string } {
  const executable = process.env.STUDIO_CLAUDE_PATH;

  return executable ? { claudeExecutable: executable } : {};
}

function toSdkOptions(deps: AgentRunnerDeps): SdkDriverOptions {
  const canvas = deps.canvas ? { canvas: deps.canvas } : {};

  return {
    preview: deps.preview,
    ...canvas,
    ...(deps.comments ? { comments: deps.comments } : {}),
    layerLocks: deps.layerLocks ?? null,
    frameStates: deps.frameStates ?? null,
    runtime: deps.runtime ?? null,
    skillsRoot: path.join(deps.config.dataDir, "skills-plugins"),
    exportsRoot: path.join(deps.config.dataDir, "exports"),
    ...claudeExecutableOption(),
  };
}

interface AgentRunParts {
  readonly driver: RunDriver;
  readonly fibers: RunFibers | null;
}

function createAgentRunner(
  deps: AgentRunnerDeps,
  parts: AgentRunParts
): AgentRunner {
  const { driver, fibers } = parts;

  const registry = packRegistry(undefined, {
    userDir: path.join(deps.config.dataDir, "packs"),
  });

  return createRunLifecycle(
    {
      ...deps,
      beforeCommit: designSystemBeforeCommit(deps.bus, registry),
      fibers,
    },
    driver
  );
}

function designSystemBeforeCommit(
  bus: EventBus,
  registry?: PackRegistry
): (project: Project, direction: Direction) => Promise<void> {
  return async (project, direction) => {
    if (project.designSystemFor && registry) {
      await refreshDraftCoverage(direction.workTree, registry).catch(
        (error: unknown) =>
          console.error(
            `[agent] coverage refresh failed for ${project.id}`,
            error
          )
      );
    }

    const result = await syncDesignSystem(direction.workTree);

    if (result.errors.length === 0) {
      return;
    }

    bus.emit({
      type: "preview.build-error",
      projectId: project.id,
      directionId: direction.id,
      message: buildErrorMessage(result.errors),
      file: TOKENS_FILE,
    });
  };
}

export { createAgentRunner, designSystemBeforeCommit, toSdkOptions };
export type { AgentRunParts, AgentRunnerDeps };
export type { RunDriver } from "./lifecycle.js";
export type { RunFibers } from "./run-runner.js";
export type { SdkDriverOptions } from "./sdk-driver.js";
export { askQuestions } from "./clarify.js";
export { COMMENT_STATUSES, describeCommentList } from "./comment-tools.js";
export { isLeanRun, leanContext, leanRunConfig } from "./lean-run.js";
export { AgentSdkClient } from "./agent-sdk-client.js";
export { createRunLifecycle } from "./lifecycle.js";
export { RunRunner } from "./run-runner.js";
export {
  BASH_EDIT_TOOL,
  EDIT_TOOL_NAMES,
  canChangePreview,
  createCanUseTool,
  createPreToolUseGuard,
} from "./permissions.js";
export {
  buildFlowPlan,
  buildPortPlan,
  portFlowText,
  portPlanText,
  readSourcePage,
  sourcePagePath,
} from "./port-plan.js";
export {
  compareToReference,
  mimeOfPath,
  scoreLines,
} from "./reference-check.js";
export { loadRepoContext } from "./repo-context.js";
export { resolveRunTarget } from "./run-target.js";
export { createSdkDriver } from "./sdk-driver.js";
export { discoverSkills, prepareSkills } from "./skills.js";
export { buildUserText } from "./user-message.js";
export type { PortPlanInput } from "./port-plan.js";
export type { PreparedSkills } from "./skills.js";
