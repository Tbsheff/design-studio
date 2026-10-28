import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { DIRECT_STYLE_PROPERTIES, type DirectStyleProperty, type Project, type Version } from '../../shared/contracts.js';
import { kebabKeys } from '../../shared/style-keys.js';
import { evaluateToolUse } from '../agent/permissions.js';
import { SOURCE_DIR } from '../design-system/extract/draft.js';
import { withPagePath } from '../export/source.js';
import type { ActivityDraft } from './activity.js';
import { EditError, type EditDeps } from './edit-deps.js';
import { describeElement } from './element.js';
import type { ToolResult } from './tools.js';

export const SELECTOR_MAX = 2000;
export const PATH_MAX = 300;

export const id = (what: string) => z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'must be an id of 1 to 64 letters, digits, - or _').describe(what);
export const projectId = id('Project id from list_projects.');
export const directionId = id('Direction id. Leave out for the main direction.').optional();
export const selector = z.string().trim().min(1).max(SELECTOR_MAX);
export const pagePath = z.string().trim().max(PATH_MAX).optional().describe('Page path in the project, for example "about.html". Leave out for the entry page.');
export const packId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const styleValue = z.string().max(200).nullable();
const styleObject = z.object(Object.fromEntries(DIRECT_STYLE_PROPERTIES.map((prop) => [prop, styleValue.optional()])) as Record<DirectStyleProperty, z.ZodOptional<typeof styleValue>>).strict();
export const style = z.preprocess(kebabKeys, styleObject);

const classNames = z.array(z.string().trim().min(1).max(100)).max(30);
export const classes = z.object({ add: classNames.optional(), remove: classNames.optional() }).strict().describe('Tailwind classes to add or remove, with any variant prefix (md:p-8, hover:bg-primary). An added class replaces the class of the same utility and variant (p-6 replaces p-4). Works on a plain class or className string and on string arguments of cn(), clsx() or twMerge(); a class built at runtime or a cva() result is refused.');
export const variant = z.string().trim().max(60).describe("Breakpoint and state the style applies to, with the same code path as the studio inspector variant bar: \"md:\" (768 px and up), \"lg:\", \"hover:\", \"focus:\", \"active:\", \"dark:\" or a mix such as \"md:hover:\". In a Tailwind project style becomes prefixed classes (md:p-6, hover:bg-primary); in a plain HTML page it becomes a media query or :hover rule; other files refuse it. Leave out for the base style.");
export const hasClasses = (input: { classes?: { add?: string[]; remove?: string[] } }) => (input.classes?.add?.length ?? 0) + (input.classes?.remove?.length ?? 0) > 0;

export interface Meta {
  title: string;
  description: string;
  readOnly?: boolean;
  destructive?: boolean;
  idempotent?: boolean;
}

export interface Done {
  result: ToolResult;
  activity?: ActivityDraft;
}

export interface ToolSpec {
  name: string;
  schema: z.ZodType;
  meta: Meta;
  run(deps: EditDeps, args: Record<string, unknown>, client: string): Promise<Done>;
}

export function parseInput<S extends z.ZodType>(schema: S, args: Record<string, unknown>): z.output<S> {
  const result = schema.safeParse(args);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new EditError(issue ? `${issue.path.join('.') || 'input'}: ${issue.message}` : 'input is not valid');
  }
  return result.data;
}

export function defineTool<S extends z.ZodType>(name: string, schema: S, meta: Meta, run: (deps: EditDeps, input: z.output<S>, client: string) => Promise<Done>): ToolSpec {
  return { name, schema, meta, run: (deps, args, client) => run(deps, parseInput(schema, args), client) };
}

export function ok(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}

export const plain = (result: ToolResult): Done => ({ result });

export const base = (project: Project, did: string) => `/api/projects/${encodeURIComponent(project.id)}/d/${encodeURIComponent(did)}`;

export function versionActivity(project: Project, direction: Project['directions'][number], summary: string, version: Version | null | undefined): ActivityDraft {
  return { projectId: project.id, directionId: direction.id, summary, versionId: version?.id ?? null, beforeVersionId: version?.parentId ?? null };
}

export async function pageUrl(deps: EditDeps, project: Project, direction: Project['directions'][number], page: string | undefined): Promise<string> {
  return withPagePath(await deps.preview.directionUrl(project, direction), page || undefined);
}

export async function sourceElement(deps: EditDeps, url: string, sel: string) {
  const element = await describeElement(deps.preview, url, sel);
  if (!element) throw new EditError(`No element matches ${sel} on the page.`);
  if (!element.source) throw new EditError(`${sel} has no source location, so it cannot be edited directly. Use write_file.`);
  return { ...element, source: element.source };
}

export async function writeText(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.mcp-${randomBytes(4).toString('hex')}.tmp`);
  await writeFile(temp, content);
  try {
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

export function checkWritePath(project: Project, workTree: string, raw: string): string {
  if (path.isAbsolute(raw) || raw.startsWith('~') || raw.includes('\0') || raw.split(/[\\/]/).some((part) => part === '..')) throw new EditError(`Path ${raw} must be relative to the project folder, with no "..".`);
  const result = evaluateToolUse({ workTree, mode: 'edit', allowBash: false, allowInstall: false, ...(project.designSystemFor ? { readOnlyDirs: [SOURCE_DIR] } : {}) }, 'Write', { file_path: raw });
  if (result.behavior === 'deny') throw new EditError(result.message.replace('mcp__studio__canvas_place', 'canvas_place'));
  const relative = path.relative(workTree, path.resolve(workTree, raw)).split(path.sep).join('/');
  if (relative === '' || relative.startsWith('..')) throw new EditError(`Path ${raw} is not a file in the project folder.`);
  return relative;
}
