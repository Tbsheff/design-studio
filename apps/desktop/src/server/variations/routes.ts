import type {
  Direction,
  DirectionVariation,
  Project,
  RunRequest,
  VariationBriefsResult,
  VariationStartResult,
} from "@design-studio/contracts";
import type { Result, Schema } from "effect";
import type { Hono } from "hono";
import { nanoid } from "nanoid";

import { levelOf, resolveRunConfig } from "../../shared/run-levels.js";
import type { AgentRunner } from "../../shared/server-ports.js";
import { readDesignSystemState } from "../design-system/state.js";
import type { ServerConfig } from "../platform/config/index.js";
import {
  BadRequestError,
  ConflictError,
  assertSafeId,
} from "../platform/errors/index.js";
import { bindMcpReadRuntime } from "../preview/mcp-read-core.js";
import type { StudioProjectStore } from "../store/projects.js";
import {
  decodeBriefsBody,
  decodeKeepBody,
  decodeMixBody,
  decodeStartBody,
} from "./body-schema.js";
import {
  countProblem,
  createMockBriefGenerator,
  createSdkBriefGenerator,
  validateUserBriefs,
  type BriefGenerator,
} from "./briefs.js";
import { listElementVariants } from "./element-variants.js";
import { createGroupRegistry, fanOut, groupDirections } from "./fanout.js";
import { buildReference, labelOf, mixPrompt } from "./reference.js";
import {
  buildScope,
  keepElementVariant,
  type KeepDeps,
  type KeepResult,
} from "./scope.js";

interface VariationRouteDeps {
  config: ServerConfig;
  projects: StudioProjectStore;
  runner: AgentRunner;
  startRun: (
    project: Project,
    direction: Direction,
    request: RunRequest
  ) => Promise<string>;
  withDirection: <T>(
    pid: string,
    did: string,
    task: (project: Project, direction: Direction) => Promise<T>
  ) => Promise<T>;
  forkDirection: (
    pid: string,
    input: {
      name: string;
      fromVersionId: string | null;
      variation?: DirectionVariation;
    }
  ) => Promise<Direction>;
  briefs?: BriefGenerator;
  edit: KeepDeps;
}

function parse<Value>(
  decode: (raw: unknown) => Result.Result<Value, Schema.SchemaError>,
  raw: unknown
): Value {
  const result = decode(raw);
  if (result._tag === "Failure")
    throw new BadRequestError(
      String(result.failure.message).replaceAll("\n", "; ")
    );
  return result.success;
}

async function body(c: {
  req: { json: () => Promise<unknown> };
}): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new BadRequestError("invalid JSON body");
  }
}

function sourceDirection(
  project: Project,
  fromDirectionId: string | null | undefined
): Direction | null {
  if (!fromDirectionId) return null;
  const direction = project.directions.find(
    (candidate) =>
      candidate.id === assertSafeId(fromDirectionId, "fromDirectionId")
  );
  if (!direction)
    throw new BadRequestError(`direction ${fromDirectionId} not found`);
  return direction;
}

type KeepVariant = (
  projectId: string,
  groupId: string,
  directionId: string
) => Promise<KeepResult>;

interface VariationRoutes {
  readonly keepVariant: KeepVariant;
}

export function registerVariationRoutes(
  app: Hono,
  deps: VariationRouteDeps
): VariationRoutes {
  const { projects, runner } = deps;
  bindMcpReadRuntime({ runner });
  const briefs =
    deps.briefs ??
    (deps.config.agentMode === "mock"
      ? createMockBriefGenerator()
      : createSdkBriefGenerator(
          process.env.STUDIO_CLAUDE_PATH
            ? { claudeExecutable: process.env.STUDIO_CLAUDE_PATH }
            : {}
        ));
  const groups = createGroupRegistry();

  app.post("/api/projects/:pid/variations/briefs", async (c) => {
    const input = parse(decodeBriefsBody, await body(c));
    const project = await projects.get(c.req.param("pid"));
    const problem = countProblem(input.count, project.kind);
    if (problem) throw new BadRequestError(problem);
    const from = sourceDirection(project, input.fromDirectionId);
    const designSystem = from
      ? await readDesignSystemState(project, from).catch(() => null)
      : null;
    const result: VariationBriefsResult = await briefs.generate({
      prompt: input.prompt,
      count: input.count,
      kind: project.kind,
      hasDesign: Boolean(from?.headVersionId),
      hasDesignSystem: Boolean(designSystem?.tokens),
      element: input.element
        ? { tag: input.element.tag, text: input.element.text }
        : null,
    });
    return c.json(result);
  });

  app.post("/api/projects/:pid/variations", async (c) => {
    const pid = c.req.param("pid");
    const input = parse(decodeStartBody, await body(c));
    const project = await projects.get(pid);
    let validBriefs;
    try {
      validBriefs = validateUserBriefs(input.briefs, project.kind);
    } catch (error) {
      throw new BadRequestError(
        error instanceof Error ? error.message : String(error)
      );
    }
    const from = sourceDirection(project, input.fromDirectionId);
    if (input.element && !from)
      throw new BadRequestError(
        "fromDirectionId is required for element variants"
      );
    const scope =
      input.element && from
        ? await buildScope(project, from, deps.edit.versions, input.element)
        : undefined;
    const level = levelOf(
      { level: input.level as RunRequest["level"] },
      project.settings
    );
    const groupId = nanoid(10);
    const items = await fanOut(
      {
        createDirection: (name, variation) =>
          deps.forkDirection(pid, {
            name,
            fromVersionId: from?.headVersionId ?? null,
            variation,
          }),
        startRun: (direction, request) =>
          deps.withDirection(
            pid,
            direction.id,
            async (latestProject, latest) => {
              if (runner.isRunning(latestProject.id, latest.id))
                throw new ConflictError("run_in_progress");
              return deps.startRun(latestProject, latest, request);
            }
          ),
      },
      {
        groupId,
        prompt: input.prompt,
        briefs: validBriefs,
        level,
        attachmentIds: input.attachmentIds,
        takenNames: new Set(
          project.directions.map((direction) => direction.name)
        ),
        ...(scope ? { scope } : {}),
      }
    );
    groups.remember(
      groupId,
      items.flatMap((item) => (item.runId ? [item.runId] : []))
    );
    const perRunBudgetUsd = resolveRunConfig(
      project.settings,
      level
    ).maxBudgetUsd;
    const result: VariationStartResult = {
      groupId,
      items,
      perRunBudgetUsd,
      totalBudgetUsd:
        perRunBudgetUsd === null
          ? null
          : Math.round(perRunBudgetUsd * validBriefs.length * 100) / 100,
    };
    return c.json(result);
  });

  app.post("/api/projects/:pid/variations/mix", async (c) => {
    const pid = c.req.param("pid");
    const input = parse(decodeMixBody, await body(c));
    if (input.fromDirectionId === input.toDirectionId)
      throw new BadRequestError("pick another variation as the target");
    const project = await projects.get(pid);
    const from = sourceDirection(project, input.fromDirectionId);
    if (!from) throw new BadRequestError("fromDirectionId is required");
    const reference = await buildReference(from, input.element);
    const runId = await deps.withDirection(
      pid,
      assertSafeId(input.toDirectionId, "toDirectionId"),
      async (latestProject, target) => {
        if (runner.isRunning(latestProject.id, target.id))
          throw new ConflictError("run_in_progress");
        const request: RunRequest = {
          prompt: mixPrompt(
            reference.fromLabel,
            labelOf(target),
            reference.tag,
            input.prompt
          ),
          mode: "edit",
          level: levelOf(
            { level: input.level as RunRequest["level"] },
            latestProject.settings
          ),
          reference,
        };
        return deps.startRun(latestProject, target, request);
      }
    );
    if (from.variation) groups.add(from.variation.groupId, runId);
    return c.json({ runId });
  });

  app.get("/api/projects/:pid/variations/elements", async (c) => {
    const project = await projects.get(c.req.param("pid"));
    return c.json(await listElementVariants(project, runner));
  });

  const keep = async (
    pid: string,
    groupId: string,
    directionId: string
  ): Promise<KeepResult> => {
    const project = await projects.get(pid);
    const variant = groupDirections(project, groupId).find(
      (direction) => direction.id === directionId
    );
    if (!variant)
      throw new BadRequestError(
        `direction ${directionId} is not in variation group ${groupId}`
      );
    const target = variant.variation?.scope?.sourceDirectionId;
    if (!target) throw new BadRequestError("This is not an element variant");
    const result = await deps.withDirection(pid, target, async (latest) =>
      keepElementVariant(deps.edit, latest, variant.id)
    );
    for (const runId of groups.runIds(groupId)) runner.get(runId)?.cancel();
    return result;
  };

  app.post("/api/projects/:pid/variations/:gid/keep", async (c) => {
    const groupId = assertSafeId(c.req.param("gid"), "groupId");
    const input = parse(decodeKeepBody, await body(c));
    return c.json(await keep(c.req.param("pid"), groupId, input.directionId));
  });

  app.post("/api/projects/:pid/variations/:gid/cancel", async (c) => {
    const project = await projects.get(c.req.param("pid"));
    const groupId = assertSafeId(c.req.param("gid"), "groupId");
    const known = new Set(
      groupDirections(project, groupId).map((direction) => direction.id)
    );
    if (known.size === 0)
      throw new BadRequestError(`variation group ${groupId} not found`);
    const canceled: string[] = [];
    for (const runId of groups.runIds(groupId)) {
      const handle = runner.get(runId);
      if (!handle) continue;
      handle.cancel();
      canceled.push(runId);
    }
    return c.json({ canceled });
  });

  return { keepVariant: keep };
}

export type { KeepVariant, VariationRoutes };
