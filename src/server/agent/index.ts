import path from "node:path";

import { Effect, Layer, ManagedRuntime } from "effect";

import { TOKENS_FILE } from "../../shared/contracts.js";
import type { Direction, Project } from "../../shared/contracts.js";
import type { FrameStateDeps } from "../canvas/app-flow/frame-state-service.js";
import type { CanvasService } from "../canvas/service.js";
import { refreshDraftCoverage } from "../design-system/draft-project.js";
import { packRegistry, type PackRegistry } from "../design-system/packs.js";
import { buildErrorMessage, syncDesignSystem } from "../design-system/sync.js";
import type { StudioRuntime } from "../main/runtime.js";
import { loadConfig } from "../platform/config/index.js";
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
import { AgentSdkClient } from "./agent-sdk-client.js";
import { createRunLifecycle } from "./lifecycle.js";
import type { RunDriver } from "./lifecycle.js";
import { RunRunner } from "./run-runner.js";
import type { RunFibers } from "./run-runner.js";
import type { SdkDriverOptions } from "./sdk-driver.js";

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
}

function claudeExecutableOption(): { claudeExecutable?: string } {
  const executable = process.env.STUDIO_CLAUDE_PATH;

  return executable ? { claudeExecutable: executable } : {};
}

const pickAgentSdk = (): Layer.Layer<AgentSdkClient> => {
  if (loadConfig().agentMode === "mock") {
    return AgentSdkClient.layerTest;
  }

  return AgentSdkClient.layer;
};

const AgentRunLive = Layer.mergeAll(
  RunRunner.layer,
  Layer.unwrap(Effect.sync(pickAgentSdk))
);

const agentRuntimes = {
  current: null as ManagedRuntime.ManagedRuntime<
    RunRunner | AgentSdkClient,
    never
  > | null,
};

const agentRuntime = (): ManagedRuntime.ManagedRuntime<
  RunRunner | AgentSdkClient,
  never
> => {
  agentRuntimes.current ??= ManagedRuntime.make(AgentRunLive);

  return agentRuntimes.current;
};

function sdkOptions(deps: AgentRunnerDeps): SdkDriverOptions {
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

const createDriverEffect = (
  deps: AgentRunnerDeps
): Effect.Effect<RunDriver, never, AgentSdkClient> =>
  Effect.gen(function* resolveDriver() {
    const sdk = yield* AgentSdkClient;

    return yield* sdk.createDriver(sdkOptions(deps));
  });

const bindRunFibers = (
  runtime: ManagedRuntime.ManagedRuntime<RunRunner | AgentSdkClient, never>
): RunFibers => ({
  interrupt: (runId) => {
    runtime.runFork(
      Effect.gen(function* interruptRun() {
        const runner = yield* RunRunner;

        yield* runner.interrupt(runId);
      })
    );
  },
  launch: (runId, done, abort) => {
    runtime.runFork(
      Effect.gen(function* launchRun() {
        const runner = yield* RunRunner;

        yield* runner.launch(runId, done, abort);
      })
    );
  },
});

function lazyDriver(deps: AgentRunnerDeps): RunDriver {
  const resolved = { driver: null as Promise<RunDriver> | null };

  return async (input) => {
    if (!resolved.driver) {
      resolved.driver = agentRuntime().runPromise(createDriverEffect(deps));
    }

    const driver = await resolved.driver;

    return driver(input);
  };
}

function createAgentRunner(deps: AgentRunnerDeps): AgentRunner {
  const driver = lazyDriver(deps);
  const fibers = bindRunFibers(agentRuntime());

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

export { AgentRunLive, createAgentRunner, designSystemBeforeCommit };
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
