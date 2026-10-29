import type { Context, Hono } from 'hono';
import type { Direction, Project, RunLevel, RunRequest } from '../../shared/contracts.js';
import { cleanPortRoute, PORT_FLOW_MAX_PAGES, PORT_LEVEL_LABEL, PORT_TASK, type PortFlowPlan, type PortPlan, type PortStartResult } from '../../shared/port.js';
import { buildFlowPlan, buildPortPlan, portFlowText, portPlanText, readSourcePage, sourcePagePath, type PortPlanInput } from '../agent/port-plan.js';
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
  paths: string[] | null;
  flow: boolean;
  targetProjectId: string | null;
  route: string | null;
}

type StartableInput = PortPlanInput & { target: NonNullable<PortPlanInput['target']> };

const SOURCE_TEXT_MAX = 24_000;
const FLOW_SOURCE_MAX = 64_000;

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

function parsePaths(raw: unknown): string[] | null {
  const list: unknown[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  const paths = [...new Set(list.map(text).filter((item): item is string => item !== null).map(sourcePagePath))];
  if (paths.length > PORT_FLOW_MAX_PAGES) throw new BadRequestError(`paths can list at most ${PORT_FLOW_MAX_PAGES} pages`);
  return paths.length > 0 ? paths : null;
}

function parseQuery(raw: Record<string, unknown>): PortQuery {
  const sourceProjectId = text(raw.sourceProjectId);
  if (!sourceProjectId) throw new BadRequestError('sourceProjectId is required');
  const sourceDirectionId = text(raw.sourceDirectionId);
  const targetProjectId = text(raw.targetProjectId);
  const paths = parsePaths(raw.paths);
  return {
    sourceProjectId: assertSafeId(sourceProjectId, 'sourceProjectId'),
    sourceDirectionId: sourceDirectionId === null ? null : assertSafeId(sourceDirectionId, 'sourceDirectionId'),
    path: sourcePagePath(text(raw.path) ?? ''),
    paths,
    flow: raw.flow === true || raw.flow === 'true' || raw.flow === '1',
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

function assertTarget(deps: PortRouteDeps, input: PortPlanInput): asserts input is StartableInput {
  const target = input.target;
  if (!target) throw new BadRequestError('targetProjectId is required');
  if (!target.project.app) throw new BadRequestError(`${target.project.name} is not an attached app. Pick a project made with Open app.`);
  if (!target.route) throw new BadRequestError('route is required');
  if (target.project.id === input.source.project.id) throw new BadRequestError('The target app must be another project than the prototype.');
  if (deps.isRunning(target.project.id, target.direction.id)) throw new ConflictError(`A run is in progress in ${target.project.name}. Try again when it finishes.`);
}

function assertNewRoutes(flow: PortFlowPlan): void {
  const taken = flow.pages.filter((page) => page.routeExists);
  if (taken.length > 0) throw new ConflictError(`The app already has ${taken.map((page) => `${page.route} (${page.routeFile})`).join(', ')}. Pick a new base path.`);
}

function levelFor(project: Project): RunLevel {
  return project.settings.defaultLevel === 'wireframe' ? 'prototype' : project.settings.defaultLevel;
}

function cut(html: string, max: number): string {
  return html.length > max ? `${html.slice(0, max)}\n<!-- source cut at ${max} characters -->` : html;
}

function portPrompt(input: PortPlanInput, plan: PortPlan, html: string): string {
  const target = plan.target;
  const file = target?.routeFile ? ` (file \`${target.routeFile}\`)` : '';
  return [
    `${PORT_LEVEL_LABEL}: move the prototype page ${plan.source.path} from the project "${input.source.project.name}" into this app as the route ${target?.route ?? ''}${file}.`,
    `<port-plan>\n${portPlanText(plan)}\n</port-plan>`,
    `<prototype-source path="${plan.source.path}">\n${cut(html, SOURCE_TEXT_MAX)}\n</prototype-source>`,
  ].join('\n\n');
}

async function flowPrompt(input: PortPlanInput, flow: PortFlowPlan): Promise<string> {
  const max = Math.min(SOURCE_TEXT_MAX, Math.floor(FLOW_SOURCE_MAX / Math.max(1, flow.pages.length)));
  const pages = await Promise.all(
    flow.pages.map(async (page) => {
      const html = await readSourcePage(input.source.direction.workTree, page.path);
      return `<port-plan path="${page.path}">\n${portPlanText(page.plan)}\n</port-plan>\n\n<prototype-source path="${page.path}">\n${cut(html, max)}\n</prototype-source>`;
    }),
  );
  const files = flow.pages.map((page) => `\`${page.routeFile ?? page.route}\``).join(', ');
  return [
    `${PORT_LEVEL_LABEL}: move the ${flow.pages.length} prototype pages of a flow from the project "${input.source.project.name}" into this app as ${flow.pages.length} routes under ${flow.base}. Write these route files: ${files}.`,
    `<port-flow>\n${portFlowText(flow)}\n</port-flow>`,
    ...pages,
  ].join('\n\n');
}

function startResult(runId: string, input: StartableInput, flow: PortFlowPlan | null, plan: PortPlan | null): PortStartResult {
  const { project, direction, route } = input.target;
  const routeFile = flow ? (flow.pages[0]?.routeFile ?? null) : (plan?.target?.routeFile ?? null);
  const result: PortStartResult = { runId, projectId: project.id, directionId: direction.id, route: route ?? '', routeFile };
  if (flow) result.routes = flow.pages.map((page) => ({ path: page.path, route: page.route, routeFile: page.routeFile }));
  return result;
}

async function startFlow(deps: PortRouteDeps, input: StartableInput, paths: string[] | null): Promise<PortStartResult> {
  const flow = await buildFlowPlan({ ...input, paths });
  if (flow.pages.length === 0) throw new BadRequestError('Pick at least one page to move.');
  assertNewRoutes(flow);
  const { project, direction } = input.target;
  const request = { prompt: await flowPrompt(input, flow), mode: 'edit', level: levelFor(project), task: PORT_TASK } satisfies RunRequest;
  return startResult(await deps.startRun(project, direction, request), input, flow, null);
}

async function startPage(deps: PortRouteDeps, input: StartableInput): Promise<PortStartResult> {
  const plan = await buildPortPlan(input);
  if (plan.target?.routeExists) throw new ConflictError(`The app already has the route ${input.target.route} (${plan.target.routeFile}). Pick a new path.`);
  const html = await readSourcePage(input.source.direction.workTree, input.source.path);
  const { project, direction } = input.target;
  const request = { prompt: portPrompt(input, plan, html), mode: 'edit', level: levelFor(project), task: PORT_TASK } satisfies RunRequest;
  return startResult(await deps.startRun(project, direction, request), input, null, plan);
}

function wantsFlow(query: PortQuery): boolean {
  if (query.flow) return true;
  return query.paths !== null && !(query.paths.length === 1 && query.paths[0] === query.path);
}

export function registerPortRoutes(app: Hono, deps: PortRouteDeps): void {
  app.get('/api/port/plan', async (c) => {
    const repeated = c.req.queries('paths');
    const query = parseQuery({ ...c.req.query(), ...(repeated && repeated.length > 1 ? { paths: repeated } : {}) });
    const input = await planInput(deps, query);
    return c.json(query.flow || query.paths ? await buildFlowPlan({ ...input, paths: query.paths }) : await buildPortPlan(input));
  });

  app.post('/api/port/start', async (c) => {
    const query = parseQuery(await deps.readBody(c));
    const input = await planInput(deps, query);
    assertTarget(deps, input);
    return c.json(wantsFlow(query) ? await startFlow(deps, input, query.paths) : await startPage(deps, input), 201);
  });
}
