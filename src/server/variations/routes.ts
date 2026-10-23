import { nanoid } from 'nanoid';
import type { Hono } from 'hono';
import { z } from 'zod';
import { RUN_LEVELS, VARIATION_DEFAULT, type Direction, type DirectionVariation, type Project, type RunRequest, type VariationBriefsResult, type VariationStartResult } from '../../shared/contracts.js';
import { levelOf, resolveRunConfig } from '../../shared/run-levels.js';
import { readDesignSystemState } from '../design-system/state.js';
import { BadRequestError, ConflictError, assertSafeId } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { AgentRunner, ServerConfig } from '../types.js';
import { countProblem, createMockBriefGenerator, createSdkBriefGenerator, validateUserBriefs, type BriefGenerator } from './briefs.js';
import { createGroupRegistry, fanOut, groupDirections } from './fanout.js';
import { buildReference, labelOf, mixPrompt } from './reference.js';

interface VariationRouteDeps {
  config: ServerConfig;
  projects: StudioProjectStore;
  runner: AgentRunner;
  startRun: (project: Project, direction: Direction, request: RunRequest) => Promise<string>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
  forkDirection: (pid: string, input: { name: string; fromVersionId: string | null; variation?: DirectionVariation }) => Promise<Direction>;
  briefs?: BriefGenerator;
}

const PROMPT_MAX = 20_000;
const LevelSchema = z.enum(RUN_LEVELS as unknown as [string, ...string[]]).optional();

const BriefsBody = z.object({
  prompt: z.string().trim().min(1).max(PROMPT_MAX),
  count: z.number().int().default(VARIATION_DEFAULT),
  fromDirectionId: z.string().nullish(),
});

const StartBody = z.object({
  prompt: z.string().trim().min(1).max(PROMPT_MAX),
  briefs: z.array(z.unknown()),
  level: LevelSchema,
  fromDirectionId: z.string().nullish(),
  attachmentIds: z.array(z.string()).max(10).optional(),
});

const ElementSchema = z.object({
  selector: z.string().max(2000),
  tag: z.string().max(100),
  text: z.string().max(20_000),
  outerHTML: z.string().max(200_000),
  styles: z.record(z.string(), z.string()),
  rect: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
  source: z.object({ file: z.string().max(1000), line: z.number().int(), col: z.number().int() }).nullable(),
  ancestors: z.array(z.string()),
});

const MixBody = z.object({
  fromDirectionId: z.string(),
  toDirectionId: z.string(),
  element: ElementSchema,
  prompt: z.string().max(PROMPT_MAX).optional(),
  level: LevelSchema,
});

function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new BadRequestError(result.error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; '));
  return result.data;
}

async function body(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new BadRequestError('invalid JSON body');
  }
}

function sourceDirection(project: Project, fromDirectionId: string | null | undefined): Direction | null {
  if (!fromDirectionId) return null;
  const direction = project.directions.find((candidate) => candidate.id === assertSafeId(fromDirectionId, 'fromDirectionId'));
  if (!direction) throw new BadRequestError(`direction ${fromDirectionId} not found`);
  return direction;
}

export function registerVariationRoutes(app: Hono, deps: VariationRouteDeps): void {
  const { projects, runner } = deps;
  const briefs = deps.briefs ?? (deps.config.agentMode === 'mock' ? createMockBriefGenerator() : createSdkBriefGenerator(process.env.STUDIO_CLAUDE_PATH ? { claudeExecutable: process.env.STUDIO_CLAUDE_PATH } : {}));
  const groups = createGroupRegistry();

  app.post('/api/projects/:pid/variations/briefs', async (c) => {
    const input = parse(BriefsBody, await body(c));
    const project = await projects.get(c.req.param('pid'));
    const problem = countProblem(input.count, project.kind);
    if (problem) throw new BadRequestError(problem);
    const from = sourceDirection(project, input.fromDirectionId);
    const designSystem = from ? await readDesignSystemState(project, from).catch(() => null) : null;
    const result: VariationBriefsResult = await briefs.generate({
      prompt: input.prompt,
      count: input.count,
      kind: project.kind,
      hasDesign: Boolean(from?.headVersionId),
      hasDesignSystem: Boolean(designSystem?.tokens),
    });
    return c.json(result);
  });

  app.post('/api/projects/:pid/variations', async (c) => {
    const pid = c.req.param('pid');
    const input = parse(StartBody, await body(c));
    const project = await projects.get(pid);
    let validBriefs;
    try {
      validBriefs = validateUserBriefs(input.briefs, project.kind);
    } catch (error) {
      throw new BadRequestError(error instanceof Error ? error.message : String(error));
    }
    const from = sourceDirection(project, input.fromDirectionId);
    const level = levelOf({ level: input.level as RunRequest['level'] }, project.settings);
    const groupId = nanoid(10);
    const items = await fanOut(
      {
        createDirection: (name, variation) => deps.forkDirection(pid, { name, fromVersionId: from?.headVersionId ?? null, variation }),
        startRun: (direction, request) =>
          deps.withDirection(pid, direction.id, async (latestProject, latest) => {
            if (runner.isRunning(latestProject.id, latest.id)) throw new ConflictError('run_in_progress');
            return deps.startRun(latestProject, latest, request);
          }),
      },
      { groupId, prompt: input.prompt, briefs: validBriefs, level, attachmentIds: input.attachmentIds, takenNames: new Set(project.directions.map((direction) => direction.name)) },
    );
    groups.remember(groupId, items.flatMap((item) => (item.runId ? [item.runId] : [])));
    const perRunBudgetUsd = resolveRunConfig(project.settings, level).maxBudgetUsd;
    const result: VariationStartResult = { groupId, items, perRunBudgetUsd, totalBudgetUsd: perRunBudgetUsd === null ? null : Math.round(perRunBudgetUsd * validBriefs.length * 100) / 100 };
    return c.json(result);
  });

  app.post('/api/projects/:pid/variations/mix', async (c) => {
    const pid = c.req.param('pid');
    const input = parse(MixBody, await body(c));
    if (input.fromDirectionId === input.toDirectionId) throw new BadRequestError('pick another variation as the target');
    const project = await projects.get(pid);
    const from = sourceDirection(project, input.fromDirectionId);
    if (!from) throw new BadRequestError('fromDirectionId is required');
    const reference = await buildReference(from, input.element);
    const runId = await deps.withDirection(pid, assertSafeId(input.toDirectionId, 'toDirectionId'), async (latestProject, target) => {
      if (runner.isRunning(latestProject.id, target.id)) throw new ConflictError('run_in_progress');
      const request: RunRequest = {
        prompt: mixPrompt(reference.fromLabel, labelOf(target), reference.tag, input.prompt),
        mode: 'edit',
        level: levelOf({ level: input.level as RunRequest['level'] }, latestProject.settings),
        reference,
      };
      return deps.startRun(latestProject, target, request);
    });
    if (from.variation) groups.add(from.variation.groupId, runId);
    return c.json({ runId });
  });

  app.post('/api/projects/:pid/variations/:gid/cancel', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const groupId = assertSafeId(c.req.param('gid'), 'groupId');
    const known = new Set(groupDirections(project, groupId).map((direction) => direction.id));
    if (known.size === 0) throw new BadRequestError(`variation group ${groupId} not found`);
    const canceled: string[] = [];
    for (const runId of groups.runIds(groupId)) {
      const handle = runner.get(runId);
      if (!handle) continue;
      handle.cancel();
      canceled.push(runId);
    }
    return c.json({ canceled });
  });
}
