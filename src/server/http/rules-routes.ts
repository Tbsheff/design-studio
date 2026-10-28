import type { Context, Hono } from 'hono';
import { z } from 'zod';
import type { Direction, Project, Version } from '../../shared/contracts.js';
import { DESIGN_RULES_TEXT_MAX, type DesignRule, type DesignRulesState, type DesignRulesTestResult } from '../../shared/design-rules.js';
import type { CanvasService } from '../canvas/service.js';
import { ruleHits } from '../design-rules/check.js';
import { isTestable, parseRules } from '../design-rules/parse.js';
import { loadDesignRules, saveDesignRules } from '../design-rules/store.js';
import { resolveReviewFrame } from '../review/frame.js';
import { runReview } from '../review/run.js';
import { BadRequestError } from '../store/errors.js';
import type { PreviewService } from '../types.js';

export interface RulesRouteDeps {
  preview: PreviewService;
  canvas: CanvasService;
  readBody: (c: Context) => Promise<unknown>;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
  projectDir: (pid: string) => string;
  commitDesignMd: (project: Project, direction: Direction) => Promise<Version | null>;
}

const side = z.number().int().min(200).max(4000);
const text = z.string().max(DESIGN_RULES_TEXT_MAX);
const saveSchema = z.object({ text }).strict();
const testSchema = z.object({ text: text.optional(), frame: z.string().trim().min(1).max(60).optional(), path: z.string().trim().max(300).optional(), width: side.optional(), height: side.optional() }).strict();

function parse<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new BadRequestError(issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'body is not valid');
  }
  return parsed.data;
}

export function rulesLoader(projectDir: (pid: string) => string) {
  return async (project: Project, direction: Direction): Promise<DesignRule[]> => (await loadDesignRules({ project, direction, studioDir: projectDir(project.id) })).rules;
}

export async function readRules(deps: Pick<RulesRouteDeps, 'projectDir'>, project: Project, direction: Direction): Promise<DesignRulesState> {
  return loadDesignRules({ project, direction, studioDir: deps.projectDir(project.id) });
}

export async function writeRules(deps: Pick<RulesRouteDeps, 'projectDir' | 'commitDesignMd'>, project: Project, direction: Direction, value: string): Promise<{ state: DesignRulesState; versionId: string | null; version: Version | null }> {
  const place = { project, direction, studioDir: deps.projectDir(project.id) };
  const saved = await saveDesignRules(place, value);
  const version = saved.inRepo ? await deps.commitDesignMd(project, direction) : null;
  return { state: await loadDesignRules(place), versionId: version?.id ?? null, version };
}

export async function testRules(deps: Pick<RulesRouteDeps, 'preview' | 'canvas' | 'projectDir'>, project: Project, direction: Direction, input: z.output<typeof testSchema>): Promise<DesignRulesTestResult> {
  const rules = input.text === undefined ? (await readRules(deps, project, direction)).rules : parseRules(input.text);
  const frame = await resolveReviewFrame(deps.canvas, project, direction, input);
  const notes: string[] = [];
  const testable = rules.filter(isTestable);
  if (testable.length === 0) notes.push('No rule here can be checked on a page. The agent and the critic still get them.');
  const review = testable.length > 0 ? await runReview(deps.preview, { project, direction, frame, rules: testable }) : null;
  const findings = review?.findings.filter((finding) => finding.kind === 'rule') ?? [];
  return { rules, hits: ruleHits(rules, findings), frame: { ...(frame.path ? { path: frame.path } : {}), width: frame.width, height: frame.height }, notes };
}

export { testSchema as rulesTestSchema };

export function registerRulesRoutes(app: Hono, deps: RulesRouteDeps): void {
  app.get('/api/projects/:pid/d/:did/rules', async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await readRules(deps, project, direction));
  });

  app.put('/api/projects/:pid/d/:did/rules', async (c) => {
    const input = parse(saveSchema, await deps.readBody(c));
    return c.json(await deps.withDirection(c.req.param('pid'), c.req.param('did'), (project, direction) => writeRules(deps, project, direction, input.text)));
  });

  app.post('/api/projects/:pid/d/:did/rules/test', async (c) => {
    const input = parse(testSchema, await deps.readBody(c));
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await testRules(deps, project, direction, input));
  });
}
