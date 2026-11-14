import { Effect } from "effect";

import type { DesignSystemPromptContext } from "../../shared/server-ports.js";
import { isStarterLookRun } from "../agent/index.js";
import type { RunDriver } from "../agent/index.js";
import { loadDesignSystemPromptContext } from "../design-system/model/index.js";
import { runAgentTool } from "../mcp/index.js";
import { createStarterLook } from "../style-scope/index.js";
import type { StarterLook } from "../style-scope/index.js";
import type { StudioRuntime } from "./runtime.js";

type DriverInput = Parameters<RunDriver>[0];

type DriverOutcome = Awaited<ReturnType<RunDriver>>;

const LOOK_TOPIC = "Look";

const DECISION_TOOL = "create_decision_run";

const createLook = (
  input: DriverInput,
  runtime: StudioRuntime
): Promise<StarterLook | null> =>
  runtime.runPromise(
    createStarterLook({
      brief: input.ctx.request.prompt,
      directionId: input.ctx.direction.id,
      projectId: input.ctx.project.id,
    }).pipe(Effect.orElseSucceed(() => null))
  );

const createLookDecision = async (
  input: DriverInput,
  runtime: StudioRuntime,
  look: StarterLook
): Promise<void> => {
  await runAgentTool(runtime, DECISION_TOOL, {
    args: {
      chosen: look.chosen,
      directionId: input.ctx.direction.id,
      options: [...look.options],
      projectId: input.ctx.project.id,
      runId: input.runId,
      topic: LOOK_TOPIC,
    },
  });
};

const getPromptContext = async (
  input: DriverInput
): Promise<DesignSystemPromptContext | null> => {
  try {
    return await loadDesignSystemPromptContext(
      input.ctx.direction.workTree,
      input.ctx.project
    );
  } catch {
    return null;
  }
};

const startStarterLookRun = async (
  driver: RunDriver,
  input: DriverInput,
  runtime: StudioRuntime
): Promise<DriverOutcome> => {
  const look = await createLook(input, runtime);

  if (look === null) {
    return driver(input);
  }

  const designSystem = await getPromptContext(input);

  const outcome = await driver({
    ...input,
    ctx: { ...input.ctx, designSystem },
  });

  if (outcome.status === "completed" && !input.signal.aborted) {
    await createLookDecision(input, runtime, look);
  }

  return outcome;
};

const toStarterLookDriver =
  (driver: RunDriver, runtime: StudioRuntime): RunDriver =>
  async (input) => {
    if (!(await isStarterLookRun(input.ctx))) {
      return driver(input);
    }

    return startStarterLookRun(driver, input, runtime);
  };

export { toStarterLookDriver };
