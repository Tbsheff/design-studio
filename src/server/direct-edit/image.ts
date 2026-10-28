import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Direction, Project, VersionMeta } from '../../shared/contracts.js';
import { IMAGE_ALT_MAX, IMAGE_FITS, IMAGE_MODES, type ImageFit, type SetImageResult } from '../../shared/image.js';
import { OWNERS_MAX, OWNER_STACK_MAX } from '../../shared/props.js';
import type { InsertScope } from '../components/insert.js';
import { DirectEditError } from './errors.js';
import { jsxElementAt, jsxTagName, setHtmlAttrs, setJsxAttrs, type AttrChanges } from './image-attrs.js';
import { imageFromBase64, imageFromUrl, type ImageBytes } from './image-source.js';
import { assertCanEdit, patchSource, publishVersion, resolveSource, saveDeferred, themeForFile, writeAtomic, type DirectEditDeps, type ResolvedSource } from './index.js';
import { planInsertJsx } from './jsx-insert.js';
import { savesSettled } from './save-queue.js';

const loc = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const focal = z.string().trim().regex(/^(\d{1,3}(\.\d+)?%|left|right|center|top|bottom)(\s+(\d{1,3}(\.\d+)?%|left|right|center|top|bottom))?$/, 'focal must be "x% y%", for example "50% 30%"');
const requestSchema = z
  .object({
    target: z.object({ source: loc.nullable(), tag: z.string().min(1).max(100), selector: z.string().max(2000).optional(), owners: z.array(z.object({ name: z.string().max(64), stack: z.string().max(OWNER_STACK_MAX) })).max(OWNERS_MAX).optional(), background: z.boolean().optional() }).strict(),
    mode: z.enum(IMAGE_MODES).optional(),
    image: z.object({ name: z.string().max(300), data: z.string().min(1) }).strict().optional(),
    url: z.string().trim().min(1).max(2000).optional(),
    fit: z.enum(IMAGE_FITS).optional(),
    focal: focal.optional(),
    alt: z.string().max(IMAGE_ALT_MAX).refine((value) => !/[\u0000-\u001f]/.test(value), 'alt has control characters').nullable().optional(),
    position: z.enum(['inside', 'after']).optional(),
  })
  .strict()
  .refine((input) => !(input.image && input.url), 'pass image or url, not both');

export type ParsedImageRequest = z.output<typeof requestSchema>;

export interface AssetPlan {
  file: string;
  relative: string;
  bytes: Buffer;
  exists: boolean;
  src: string;
}

export interface ImagePlan {
  target: ResolvedSource;
  original: string;
  code: string;
  asset: AssetPlan | null;
  mode: SetImageResult['mode'];
  title: string;
  select?: SetImageResult['select'];
}

const BLOCKED = new Set(['node_modules', '.git', '.studio', 'dist', '.next', '.vite']);
const FIT_SIZE: Record<ImageFit, string> = { cover: 'cover', contain: 'contain', fill: '100% 100%' };

export function parseSetImage(raw: unknown): ParsedImageRequest {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DirectEditError('invalid_request', issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'The image request is not valid');
  }
  return parsed.data;
}

function isHtml(relative: string): boolean {
  return /\.html?$/i.test(relative);
}

function assetHome(project: Project, page: string | null): { dir: string; rooted: boolean } {
  if (project.app) return { dir: path.posix.join(project.app.appDir.replace(/\\/g, '/'), 'public'), rooted: true };
  if (project.kind === 'react' && !(page && isHtml(page))) return { dir: 'public', rooted: true };
  return { dir: 'assets', rooted: false };
}

export async function planAsset(project: Project, workTree: string, page: string | null, image: ImageBytes): Promise<AssetPlan> {
  const home = assetHome(project, page);
  const suffix = `-${createHash('sha256').update(image.bytes).digest('hex').slice(0, 10)}.${image.ext}`;
  const root = await realpath(workTree);
  const same = (await readdir(path.join(root, ...home.dir.split('/'))).catch(() => [] as string[])).find((entry) => entry.endsWith(suffix));
  const name = same ?? `${image.stem}${suffix}`;
  const relative = path.posix.normalize(path.posix.join(home.dir, name));
  if (relative.startsWith('..') || relative.split('/').some((part) => BLOCKED.has(part))) throw new DirectEditError('invalid_source', `The studio cannot write ${relative}.`);
  const file = path.join(root, ...relative.split('/'));
  const exists = Boolean(await stat(file).catch(() => null));
  const src = home.rooted ? `/${name}` : path.posix.relative(path.posix.dirname(page ?? 'index.html'), relative);
  return { file, relative, bytes: image.bytes, exists, src };
}

export async function loadImage(request: ParsedImageRequest): Promise<ImageBytes | null> {
  if (request.image) return imageFromBase64(request.image.data, request.image.name);
  if (request.url) return imageFromUrl(request.url);
  return null;
}

function modeOf(request: ParsedImageRequest): ImagePlan['mode'] {
  if (request.mode && request.mode !== 'auto') return request.mode;
  if (request.target.tag.toLowerCase() === 'img') return 'img';
  return request.target.background ? 'background' : 'insert';
}

function styleFor(mode: ImagePlan['mode'], request: ParsedImageRequest, asset: AssetPlan | null): Record<string, string> {
  const style: Record<string, string> = {};
  if (mode === 'img') {
    if (request.fit) style['object-fit'] = request.fit;
    if (request.focal) style['object-position'] = request.focal;
    return style;
  }
  if (asset) style['background-image'] = `url(${asset.src})`;
  if (request.fit) style['background-size'] = FIT_SIZE[request.fit];
  if (request.focal) style['background-position'] = request.focal;
  if (asset || request.fit) style['background-repeat'] = 'no-repeat';
  return style;
}

function attrsFor(request: ParsedImageRequest, asset: AssetPlan | null): AttrChanges {
  const attrs: AttrChanges = {};
  if (asset) Object.assign(attrs, { src: asset.src, srcset: null, srcSet: null });
  if (request.alt !== undefined) attrs.alt = request.alt ?? '';
  return attrs;
}

function titleOf(mode: ImagePlan['mode'], tag: string, request: ParsedImageRequest, asset: AssetPlan | null): string {
  if (mode === 'insert') return `Insert image ${request.position === 'after' ? 'after' : 'into'} ${tag}`;
  const parts = [...(asset ? ['replace'] : []), ...(request.fit ? [`fit ${request.fit}`] : []), ...(request.focal ? ['focal point'] : []), ...(request.alt !== undefined ? ['alt text'] : [])];
  return `${mode === 'background' ? 'Background image' : 'Image'} of ${tag}: ${parts.join(', ') || 'no change'}`;
}

async function planReplace(scope: InsertScope, request: ParsedImageRequest, mode: ImagePlan['mode'], image: ImageBytes | null): Promise<ImagePlan> {
  const source = request.target.source;
  if (!source) throw new DirectEditError('element_not_found', 'This element has no source location. Ask the agent to change the image in Chat.');
  const target = await resolveSource(scope.workTree, source.file);
  const original = await readFile(target.file, 'utf8');
  const asset = image ? await planAsset(scope.project, scope.workTree, target.relative, image) : null;
  const html = isHtml(target.relative);
  const typescript = path.extname(target.relative).toLowerCase() === '.tsx';
  const element = html ? null : jsxTagName(jsxElementAt(original, source, typescript));
  const style = styleFor(mode, request, asset);
  const theme = await themeForFile(scope.workTree, target.relative, original, { projectKind: scope.project.kind });
  const base = { source, selector: request.target.selector ?? '', ...(element && !element.host ? { component: element.name } : { tag: request.target.tag.toLowerCase() }) };
  const styled = Object.keys(style).length > 0 ? patchSource(target.relative, original, { ...base, style }, theme).code : original;
  const attrs = mode === 'img' ? attrsFor(request, asset) : {};
  const position = { line: source.line, col: source.col };
  const code = Object.keys(attrs).length === 0 ? styled : html ? setHtmlAttrs(styled, position, attrs) : setJsxAttrs(styled, position, typescript, attrs);
  return { target, original, code, asset, mode, title: titleOf(mode, request.target.tag.toLowerCase(), request, asset) };
}

function snippetFor(html: boolean, tailwind: boolean, src: string, alt: string, fit: ImageFit): string {
  const safeAlt = alt.replace(/[&"<>{}]/g, (char) => `&#${char.charCodeAt(0)};`);
  if (html) return tailwind ? `<img src="${src}" alt="${safeAlt}" class="block h-auto max-w-full object-${fit}">` : `<img src="${src}" alt="${safeAlt}" style="display: block; max-width: 100%; height: auto; object-fit: ${fit}">`;
  const jsxAlt = /[&"<>{}]/.test(alt) ? `{${JSON.stringify(alt)}}` : `"${alt}"`;
  return tailwind ? `<img src="${src}" alt=${jsxAlt} className="block h-auto max-w-full object-${fit}" />` : `<img src="${src}" alt=${jsxAlt} style={{ display: 'block', maxWidth: '100%', height: 'auto', objectFit: '${fit}' }} />`;
}

async function planInsertImage(scope: InsertScope, request: ParsedImageRequest, image: ImageBytes | null): Promise<ImagePlan> {
  if (!image) throw new DirectEditError('invalid_request', 'Pass an image file or url to insert an image.');
  const page = request.target.source?.file ?? null;
  const known = page ? await resolveSource(scope.workTree, page).catch(() => null) : null;
  const text = known ? await readFile(known.file, 'utf8') : '';
  const tailwind = known ? (await themeForFile(scope.workTree, known.relative, text, { projectKind: scope.project.kind })) !== null : false;
  const asset = await planAsset(scope.project, scope.workTree, known?.relative ?? page, image);
  const html = page ? isHtml(page) : scope.project.kind === 'html';
  const jsx = snippetFor(html, tailwind, asset.src, request.alt ?? '', request.fit ?? 'cover');
  const { source, tag, selector, owners } = request.target;
  const plan = await planInsertJsx(scope, { target: { source, tag, ...(selector ? { selector } : {}), ...(owners?.length ? { owners } : {}) }, position: request.position ?? 'inside', jsx });
  return { target: plan.target, original: plan.original, code: plan.code, asset, mode: 'insert', title: titleOf('insert', tag.toLowerCase(), request, asset), select: plan.select };
}

export async function planSetImage(scope: InsertScope, request: ParsedImageRequest, image: ImageBytes | null): Promise<ImagePlan> {
  const mode = modeOf(request);
  if (mode === 'insert') return planInsertImage(scope, request, image);
  const work = Boolean(image || request.fit || request.focal) || (mode === 'img' && request.alt !== undefined);
  if (!work) throw new DirectEditError('invalid_request', mode === 'background' ? 'A background image has no alt text. Pass an image, fit or focal.' : 'Pass an image, fit, focal or alt.');
  return planReplace(scope, request, mode, image);
}

export async function writeImagePlan(plan: ImagePlan): Promise<void> {
  if (plan.asset && !plan.asset.exists) {
    await mkdir(path.dirname(plan.asset.file), { recursive: true });
    await writeFile(plan.asset.file, plan.asset.bytes, { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
    });
  }
  if (plan.code !== plan.original) await writeAtomic(plan.target.file, plan.code);
}

export function planChanged(plan: ImagePlan): boolean {
  return plan.code !== plan.original || (plan.asset !== null && !plan.asset.exists);
}

export async function applySetImage(deps: DirectEditDeps, scope: InsertScope & { direction: Direction }, raw: unknown): Promise<SetImageResult> {
  const { project, direction } = scope;
  const request = parseSetImage(raw);
  const head = assertCanEdit(deps, project, direction);
  const plan = await planSetImage(scope, request, await loadImage(request));
  const base = { file: plan.target.relative, asset: plan.asset?.relative ?? null, src: plan.asset?.src ?? null, mode: plan.mode, title: plan.title, ...(plan.select ? { select: plan.select } : {}) };
  if (!planChanged(plan)) return { ...base, version: await deps.versions.get(project, head), changed: false };
  await savesSettled(project.id);
  await writeImagePlan(plan);
  const files = [plan.target.relative, ...(plan.asset ? [plan.asset.relative] : [])];
  const meta: VersionMeta = { kind: 'manual', prompt: `Image: ${plan.title} at ${plan.target.relative}${plan.asset ? ` (${plan.asset.relative})` : ''}` };
  const version = saveDeferred(deps, project, direction, files, plan.title, meta);
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: [{ file: plan.target.file, relative: plan.target.relative, before: plan.original, after: plan.code }] });
  await publishVersion(deps, project, direction, version);
  return { ...base, version, changed: true };
}

