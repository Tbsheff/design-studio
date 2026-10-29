import type { Context, Hono } from 'hono';
import type { Direction, Project, RunLevel, RunRequest } from '../../shared/contracts.js';
import { cleanPortRoute, PORT_LEVEL_LABEL, PORT_TASK, type PortPlan, type PortStartResult } from '../../shared/port.js';
import { buildPortPlan, portPlanText, readSourcePage, sourcePagePath, type PortPlanInput } from '../agent/port-plan.js';
import { BadRequestError, ConflictError, assertSafeId } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';

export interface PortRouteDeps {
  projects: Pick<StudioProjectStore, 'get' | 'directionOf' | 'mainDirection'>;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
  isRunning: (projectId: string, directionId: string) => boolean;
  startRun: (project: Project, direction: Direction, request: RunRequest) => Promise<string>;
}

interface PortQuery {
  sourceProjectId: string;
  sourceDirectionId: string | null;
  path: string;
  targetProjectId: string | null;
  route: string | null;
}

const SOURCE_TEXT_MAX = 24_000;

function text(raw: unknown): string | null {
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}

function parseRoute(raw: unknown): string | null {
  const value = text(raw);
  if (value === null) return null;
  const route = cleanPortRoute(value);
  if (!route) throw new BadRequestError('route must be an app path like /classes or /(design)/classes: lower-case letters, digits and dashes');
  return route;
}

function parseQuery(raw: Record<string, unknown>): PortQuery {
  const sourceProjectId = text(raw.sourceProjectId);
  if (!sourceProjectId) throw new BadRequestError('sourceProjectId is required');
  const sourceDirectionId = text(raw.sourceDirectionId);
  const targetProjectId = text(raw.targetProjectId);
  return {
    sourceProjectId: assertSafeId(sourceProjectId, 'sourceProjectId'),
    sourceDirectionId: sourceDirectionId === null ? null : assertSafeId(sourceDirectionId, 'sourceDirectionId'),
    path: sourcePagePath(text(raw.path) ?? ''),
    targetProjectId: targetProjectId === null ? null : assertSafeId(targetProjectId, 'targetProjectId'),
    route: parseRoute(raw.route),
  };
}

async function planInput(deps: PortRouteDeps, query: PortQuery): Promise<PortPlanInput> {
  const source = await deps.projects.get(query.sourceProjectId);
  const sourceDirection = query.sourceDirectionId ? deps.projects.directionOf(source, query.sourceDirectionId) : deps.projects.mainDirection(source);
  const targetProject = query.targetProjectId ? await deps.projects.get(query.targetProjectId) : null;
  const target = targetProject ? { project: targetProject, direction: deps.projects.mainDirection(targetProject), route: query.route } : null;
  return { source: { project: source, direction: sourceDirection, path: query.path }, target };
}

function assertStartable(deps: PortRouteDeps, input: PortPlanInput, plan: PortPlan): asserts input is PortPlanInput & { target: NonNullable<PortPlanInput['target']> } {
  const target = input.target;
  if (!target) throw new BadRequestError('targetProjectId is required');
  if (!target.project.app) throw new BadRequestError(`${target.project.name} is not an attached app. Pick a project made with Open app.`);
  if (!target.route) throw new BadRequestError('route is required');
  if (target.project.id === input.source.project.id) throw new BadRequestError('The target app must be another project than the prototype.');
  if (plan.target?.routeExists) throw new ConflictError(`The app already has the route ${target.route} (${plan.target.routeFile}). Pick a new path.`);
  if (deps.isRunning(target.project.id, target.direction.id)) throw new ConflictError(`A run is in progress in ${target.project.name}. Try again when it finishes.`);
}

function levelFor(project: Project): RunLevel {
  return project.settings.defaultLevel === 'wireframe' ? 'prototype' : project.settings.defaultLevel;
}

function portPrompt(input: PortPlanInput, plan: PortPlan, html: string): string {
  const target = plan.target;
  const file = target?.routeFile ? ` (file \`${target.routeFile}\`)` : '';
  const source = html.length > SOURCE_TEXT_MAX ? `${html.slice(0, SOURCE_TEXT_MAX)}\n<!-- source cut at ${SOURCE_TEXT_MAX} characters -->` : html;
  return [
    `${PORT_LEVEL_LABEL}: move the prototype page ${plan.source.path} from the project "${input.source.project.name}" into this app as the route ${target?.route ?? ''}${file}.`,
    `<port-plan>\n${portPlanText(plan)}\n</port-plan>`,
    `<prototype-source path="${plan.source.path}">\n${source}\n</prototype-source>`,
  ].join('\n\n');
}

export function registerPortRoutes(app: Hono, deps: PortRouteDeps): void {
  app.get('/api/port/plan', async (c) => {
    const input = await planInput(deps, parseQuery(c.req.query()));
    return c.json(await buildPortPlan(input));
  });

  app.post('/api/port/start', async (c) => {
    const input = await planInput(deps, parseQuery(await deps.readBody(c)));
    const plan = await buildPortPlan(input);
    assertStartable(deps, input, plan);
    const html = await readSourcePage(input.source.direction.workTree, input.source.path);
    const { project, direction, route } = input.target;
    const request = { prompt: portPrompt(input, plan, html), mode: 'edit', level: levelFor(project), task: PORT_TASK } satisfies RunRequest;
    const runId = await deps.startRun(project, direction, request);
    const result: PortStartResult = { runId, projectId: project.id, directionId: direction.id, route: route ?? '', routeFile: plan.target?.routeFile ?? null };
    return c.json(result, 201);
  });
}
