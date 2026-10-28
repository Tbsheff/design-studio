import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { IMAGE_ALT_MAX, IMAGE_FITS, IMAGE_MODES, imageKindOf, type SetImageRequest, type SetImageResult } from '../../shared/image.js';
import { probeOwners } from '../components/owner-probe.js';
import { imageFromPath } from '../direct-edit/image-source.js';
import type { Direction, Project } from '../../shared/contracts.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, pageUrl, projectId, selector, versionActivity, type Done } from './edit-kit.js';
import { describeElement } from './element.js';
import { scopeOf } from './layer-ref.js';
import { resolveSourceLoc } from './source-loc.js';

export const SET_IMAGE_DESCRIPTION =
  'Place or change an image, like the Image section of the studio inspector. On an <img> it copies the file into the project (the app public/ folder for Next and Vite, assets/ for HTML) with a content-hashed name and writes src (srcset is removed), alt, fit (object-fit) and focal (object-position). On an element with a background image it writes background-image, background-size and background-position. On any other element it inserts a new <img> inside it (position "after" puts it after). In a Tailwind file fit and focal become classes (object-cover, object-[50%_30%]). One version and one undo step. url must be https, at most 10 MB, and an image content type; path is a local image file. src from a data expression such as {item.image} is refused with a reason.';

const schema = z
  .object({
    projectId,
    directionId,
    page: pagePath.describe('Page path in the project, for example "about.html". Leave out for the entry page. (path is the image file.)'),
    selector: selector.optional().describe('CSS selector or layer id of the element, for example "img.hero" or "e0k3pz".'),
    source: z.string().trim().max(1100).optional().describe('Or the element as file:line:col of its tag, as get_layers prints it.'),
    path: z.string().trim().min(1).max(1000).optional().describe('Local image file: an absolute path, or a path relative to the project folder.'),
    url: z.string().trim().url().max(2000).optional().describe('https URL of the image. The studio fetches it (10 MB at most, image types only).'),
    fit: z.enum(IMAGE_FITS).optional().describe('cover crops to fill, contain shows all of it, fill stretches.'),
    focal: z.string().trim().max(40).optional().describe('Focal point as "x% y%", for example "50% 30%". The part of the image that stays in view with fit cover.'),
    alt: z.string().max(IMAGE_ALT_MAX).nullable().optional().describe('Alt text of an <img>. "" marks it as decorative.'),
    mode: z.enum(IMAGE_MODES).optional().describe('auto (default): img for an <img>, background for an element with a background image, insert for others. background sets a background image on any element.'),
    position: z.enum(['inside', 'after']).optional().describe('For insert: inside the element (default) or after it.'),
  })
  .strict()
  .refine((input) => (input.selector === undefined) !== (input.source === undefined), 'pass selector or source, not both')
  .refine((input) => !(input.path && input.url), 'pass path or url, not both');

type Input = z.output<typeof schema>;

async function imageBody(workTree: string, input: Input): Promise<Pick<SetImageRequest, 'image' | 'url'>> {
  if (input.url) return { url: input.url };
  if (!input.path) return {};
  const file = path.isAbsolute(input.path) ? input.path : path.resolve(workTree, input.path);
  const image = await imageFromPath(file).catch((error: unknown) => {
    throw new EditError(error instanceof Error ? error.message : String(error));
  });
  return { image: { name: path.basename(file), data: image.bytes.toString('base64') } };
}

async function tagAt(file: string, line: number, col: number): Promise<string> {
  const text = await readFile(file, 'utf8').catch(() => '');
  const tag = /^<([A-Za-z][\w.]*)/.exec((text.split('\n')[line - 1] ?? '').slice(col - 1))?.[1] ?? 'element';
  return /^(img|Image)$/.test(tag) ? 'img' : tag;
}

async function targetFor(deps: EditDeps, project: Project, direction: Direction, input: Input): Promise<SetImageRequest['target']> {
  if (input.source) {
    const source = await resolveSourceLoc(direction.workTree, scopeOf(project.id, direction.id), input.source);
    return { source, tag: await tagAt(path.join(direction.workTree, source.file), source.line, source.col) };
  }
  const sel = input.selector ?? '';
  const url = await pageUrl(deps, project, direction, input.page);
  const element = await describeElement(deps.preview, url, sel);
  if (!element) throw new EditError(`No element matches ${sel} on the page.`);
  const probed = await probeOwners(deps.preview, url, sel).catch(() => null);
  if (!element.source && !probed?.owners.length) throw new EditError(`${sel} has no source location. Pass source with the file:line:col of its tag.`);
  return { source: element.source, tag: element.tag, selector: sel, background: imageKindOf(element) === 'background', ...(element.source ? {} : { html: element.outerHTML.slice(0, 4000) }), ...(probed?.owners.length ? { owners: probed.owners } : {}) };
}

function options(input: Input): Omit<SetImageRequest, 'target' | 'image' | 'url'> {
  return { ...(input.mode ? { mode: input.mode } : {}), ...(input.fit ? { fit: input.fit } : {}), ...(input.focal ? { focal: input.focal } : {}), ...(input.alt !== undefined ? { alt: input.alt } : {}), ...(input.position ? { position: input.position } : {}) };
}

const setImage = defineTool('set_image', schema, { title: 'Set image', description: SET_IMAGE_DESCRIPTION }, async (deps, input): Promise<Done> => {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  const target = await targetFor(deps, project, direction, input);
  const body: SetImageRequest = { target, ...(await imageBody(direction.workTree, input)), ...options(input) };
  let result: SetImageResult;
  try {
    result = await studioCall<SetImageResult>(deps, 'POST', `${base(project, direction.id)}/image`, body);
  } catch (error) {
    throw new EditError(error instanceof Error ? error.message : String(error));
  }
  const at = result.select?.map((item) => `${item.file}:${item.line}:${item.col}`);
  const output = ok({ changed: result.changed, mode: result.mode, file: result.file, asset: result.asset, src: result.src, ...(at ? { at } : {}), title: result.title, versionId: result.version?.id ?? null });
  return result.changed ? { result: output, activity: versionActivity(project, direction, result.title, result.version) } : { result: output };
});

export const IMAGE_TOOLS = [setImage];
