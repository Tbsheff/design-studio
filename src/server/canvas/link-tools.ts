import { z } from 'zod';
import type { CanvasFileFrame } from '../../shared/canvas-file.js';
import {
  cleanLinkSelector,
  cleanLinkText,
  isBackTarget,
  LINK_ACTIONS,
  LINK_DURATION_DEFAULT,
  LINK_DURATION_MAX,
  LINK_DURATION_MIN,
  LINK_EASINGS,
  LINK_ISSUE_TEXT,
  LINK_SELECTOR_MAX,
  LINK_TEXT_MAX,
  LINK_TRANSITIONS,
  linkAction,
  sourceName,
  linkDuration,
  withMotion,
  startFrameOf,
  staticLinkIssue,
  upsertLink,
  type LinkIssue,
  type LinkMotion,
  type LinkQuery,
  type LinksFile,
  type LinkTransition,
  type PrototypeLink,
} from '../../shared/links.js';
import type { Direction, Project } from '../../shared/contracts.js';
import { configuredFrameStates } from '../app/frame-state-service.js';
import { frameStatesView } from '../app/frame-state.js';
import { withFrameStateHost } from '../../shared/frame-state.js';
import { waitForPage } from '../export/capture.js';
import { withPagePath } from '../export/source.js';
import type { PreviewService } from '../types.js';
import { implicitLinks, keepImplicit, type AnchorReader, type PageAnchor } from './implicit-links.js';
import { findFrame, frameRef, type CanvasToolContext, type ToolText } from './tools.js';

export const BACK_REF = 'back';

export const linkSpecSchema = z
  .object({
    fromFrame: frameRef.describe('Frame id or @label of the frame that has the element.'),
    selector: z.string().trim().min(1).max(LINK_SELECTOR_MAX).describe('CSS selector of the element to click, for example "#sign-in" or "button.primary".'),
    toFrame: frameRef.describe('Frame id or @label to go to on click, or "back" to go back to the frame before.'),
    transition: z
      .enum(LINK_TRANSITIONS)
      .optional()
      .describe('instant (default), dissolve, slide-left, slide-right (both frames move sideways), push-up, push-down, move-in (the new frame moves up over the old one), move-out (the old frame moves down off the new one), or smart-animate (layers with the same id, or the same tag and text, move from their old place to the new one; the rest fade in). Use smart-animate between two states of one screen.'),
    action: z.enum(LINK_ACTIONS).optional().describe('navigate (default) replaces the frame; modal opens toFrame centred over the current frame; drawer opens it from the right edge. A backdrop click or Esc closes an overlay, and a "back" link inside it closes it too. Make modal and drawer frames the size of the dialog or panel, not a full page.'),
    duration: z.number().int().min(LINK_DURATION_MIN).max(LINK_DURATION_MAX).optional().describe(`Transition length in ms. Default ${LINK_DURATION_DEFAULT}.`),
    easing: z.enum(LINK_EASINGS).optional().describe('ease-out (default), ease-in, ease-in-out, linear or spring (small overshoot).'),
  })
  .strict();

export type LinkSpec = z.output<typeof linkSpecSchema>;

export interface ProbedElement {
  tag: string;
  text: string;
}

export type LinkProbe = ((frame: CanvasFileFrame, queries: LinkQuery[]) => Promise<(ProbedElement | null)[]>) & { anchors?: AnchorReader };

const ANCHOR_SCRIPT = `(() => {
  const out = [];
  const css = (v) => v.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
  const loc = /(?:window\\.)?location(?:\\.href)?\\s*=\\s*['"]([^'"]+)['"]|location\\.(?:assign|replace)\\(\\s*['"]([^'"]+)['"]/;
  for (const el of Array.from(document.querySelectorAll('a[href], [onclick]')).slice(0, 200)) {
    const tag = el.tagName.toLowerCase();
    const id = el.id && /^[A-Za-z_][\\w-]*$/.test(el.id) ? el.id : null;
    const raw = tag === 'a' ? el.getAttribute('href') : (loc.exec(el.getAttribute('onclick') || '') || []).slice(1).find(Boolean);
    if (!raw) continue;
    const selector = id ? '#' + id : tag === 'a' ? 'a[href="' + css(raw) + '"]' : tag + '[onclick*="' + css(raw) + '"]';
    out.push({ href: raw, selector, tag, text: (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, ${LINK_TEXT_MAX}) });
    if (out.length >= 60) break;
  }
  const counts = {};
  for (const a of out) counts[a.selector] = (counts[a.selector] || 0) + 1;
  return out.map((a) => (counts[a.selector] > 1 && a.text ? a : { href: a.href, selector: a.selector, tag: a.tag, ...(a.text ? { label: a.text } : {}) }));
})()`;

function resolveScript(queries: LinkQuery[]): string {
  return `(${JSON.stringify(queries)}).map((q) => {
    const norm = (t) => (t || '').replace(/\\s+/g, ' ').trim().toLowerCase().slice(0, ${LINK_TEXT_MAX});
    const agrees = (a, b) => { if (!b) return true; const x = norm(a); const y = norm(b); return x === y || (y.length >= 12 && x.startsWith(y)); };
    const textOf = (el) => (el.innerText ?? el.textContent ?? '');
    const found = (el) => ({ tag: el.tagName.toLowerCase(), text: textOf(el).trim().slice(0, 200) });
    let el = null;
    try { el = document.querySelector(q.selector); } catch { el = null; }
    const tag = q.tag ? q.tag.toLowerCase() : null;
    const idSelector = /^#[A-Za-z_][\\w-]*$/.test(q.selector);
    if (el && (!tag || el.tagName.toLowerCase() === tag) && (idSelector || agrees(textOf(el), q.text))) return found(el);
    if (!tag || !q.text || !/^[a-z][a-z0-9-]*$/.test(tag)) return null;
    const hit = Array.from(document.getElementsByTagName(tag)).find((item) => agrees(textOf(item), q.text));
    return hit ? found(hit) : null;
  })`;
}

export class LinkError extends Error {}

function text(value: unknown): ToolText {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}

function failure(message: string): ToolText {
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function framesOf(ctx: CanvasToolContext): Promise<CanvasFileFrame[]> {
  const frames = (await ctx.canvas.read(ctx.project)).canvas?.frames ?? [];
  return frames.length > 0 ? frames : [{ id: 'f1', width: 1440, height: 900, x: 0, y: 0, order: 0 }];
}

function frameOf(frames: CanvasFileFrame[], ref: string): CanvasFileFrame {
  const frame = findFrame(frames, ref);
  if (!frame) throw new LinkError(`No frame ${ref}. Call canvas_list for the ids and labels.`);
  return frame;
}

function frameTitle(frames: readonly CanvasFileFrame[], id: string): string {
  const frame = frames.find((item) => item.id === id);
  return frame?.label ?? frame?.path ?? (id === 'f1' ? 'the first frame' : id);
}

export function linkTitle(link: PrototypeLink, frames: readonly CanvasFileFrame[]): string {
  const target = isBackTarget(link.to) ? 'Back' : frameTitle(frames, link.to.frame);
  const what = sourceName(link.from);
  return `${what} in ${frameTitle(frames, link.from.frame)} → ${target}`;
}

async function withStateHost(project: Project, frameId: string, url: string): Promise<string> {
  const states = project.app ? configuredFrameStates() : null;
  if (!states) return url;
  const view = await frameStatesView(states.projectDir(project.id)).catch(() => null);
  return withFrameStateHost(url, view?.frames[frameId] ?? null);
}

export function probeWithPreview(preview: Pick<PreviewService, 'directionUrl' | 'withPage'>, project: Project, fallback: Direction): LinkProbe | undefined {
  const withPage = preview.withPage?.bind(preview);
  if (!withPage) return undefined;
  const run = async <T>(frame: CanvasFileFrame, script: string): Promise<T> => {
    const direction = project.directions.find((item) => item.id === frame.directionId) ?? fallback;
    const url = await withStateHost(project, frame.id, withPagePath(await preview.directionUrl(project, direction), frame.path || undefined));
    return withPage(url, { width: frame.width, height: frame.height }, async (page) => {
      await waitForPage(page);
      return page.evaluate<T>(script);
    });
  };
  const probe: LinkProbe = (frame, queries) => run<(ProbedElement | null)[]>(frame, resolveScript(queries));
  probe.anchors = (frame) => run<PageAnchor[]>(frame, ANCHOR_SCRIPT);
  return probe;
}

function queryOf(link: PrototypeLink): LinkQuery {
  return { id: link.id, selector: link.from.selector, ...(link.from.tag ? { tag: link.from.tag } : {}), ...(link.from.text ? { text: link.from.text } : {}) };
}

function describeLink(link: PrototypeLink, frames: readonly CanvasFileFrame[], issue: LinkIssue | null, start: string) {
  return {
    id: link.id,
    fromFrame: link.from.frame,
    page: link.from.path || '(entry page)',
    selector: link.from.selector,
    ...(link.from.text ? { text: link.from.text } : {}),
    toFrame: isBackTarget(link.to) ? BACK_REF : link.to.frame,
    action: linkAction(link),
    transition: link.transition,
    duration: linkDuration(link),
    ...(link.easing ? { easing: link.easing } : {}),
    title: linkTitle(link, frames),
    broken: issue ? LINK_ISSUE_TEXT[issue] : null,
    ...(link.implicit ? { implicit: true } : {}),
    ...(link.from.frame === start ? { onStartFrame: true } : {}),
  };
}

const IMPLICIT_NOTE = 'Links with implicit: true come from <a href> (or location.href onclick, or Next.js <Link>/router.push) between pages. Play and Flow use them as they are; keep_links (or edit_links keep) saves them so you can change the action or transition.';

function implicitOf(ctx: CanvasToolContext, probe: LinkProbe | undefined, file: LinksFile): Promise<PrototypeLink[]> {
  return implicitLinks({ canvas: ctx.canvas, project: ctx.project, ...(probe?.anchors ? { render: probe.anchors } : {}) }, file).catch(() => []);
}

export async function listLinks(ctx: CanvasToolContext, probe?: LinkProbe): Promise<ToolText> {
  const frames = await framesOf(ctx);
  const file = await ctx.canvas.links.read(ctx.project);
  const issues = new Map<string, LinkIssue | null>(file.links.map((link) => [link.id, staticLinkIssue(link, frames)]));
  let checked = false;
  if (probe) {
    const byFrame = new Map<string, PrototypeLink[]>();
    for (const link of file.links) if (issues.get(link.id) === null) byFrame.set(link.from.frame, [...(byFrame.get(link.from.frame) ?? []), link]);
    for (const [frameId, links] of byFrame) {
      const frame = frames.find((item) => item.id === frameId);
      if (!frame) continue;
      const found = await probe(frame, links.map(queryOf)).catch(() => null);
      if (!found) continue;
      checked = true;
      links.forEach((link, index) => issues.set(link.id, found[index] ? null : 'element-missing'));
    }
  }
  const start = startFrameOf(file, frames);
  const implicit = await implicitOf(ctx, probe, file);
  const all = [...file.links, ...implicit];
  const notes = [all.length === 0 ? 'No prototype links yet. add_link makes one; Play in the studio then starts at startFrame.' : checked ? 'Each saved link was checked against the rendered page.' : null, implicit.length > 0 ? IMPLICIT_NOTE : null].filter(Boolean);
  return text({
    startFrame: start,
    links: all.map((link) => describeLink(link, frames, issues.get(link.id) ?? null, start)),
    note: notes.length > 0 ? notes.join(' ') : undefined,
  });
}

export async function keepLinks(ctx: CanvasToolContext, ids: readonly string[] | 'all', probe?: LinkProbe, motion: LinkMotion = {}): Promise<ToolText> {
  if (ctx.plan) return failure('Plan mode is on, so the links stay as they are.');
  if (ctx.mode === 'critique') return failure('Links are not available in critique runs.');
  const frames = await framesOf(ctx);
  const done = await keepImplicit({ canvas: ctx.canvas, project: ctx.project, ...(probe?.anchors ? { render: probe.anchors } : {}) }, ids, 'agent', motion);
  if (done.kept.length === 0) return failure(done.missing.length > 0 ? `No implicit link ${done.missing.join(', ')}. Call list_links for the ids (implicit: true).` : 'No implicit links to keep.');
  const start = startFrameOf(done.file, frames);
  return text({ kept: done.kept.map((link) => describeLink(link, frames, null, start)), ...(done.missing.length > 0 ? { notFound: done.missing } : {}), links: done.file.links.length });
}

export async function addLink(ctx: CanvasToolContext, spec: LinkSpec, probe?: LinkProbe): Promise<{ result: ToolText; link?: PrototypeLink; title?: string }> {
  if (ctx.plan) return { result: failure('Plan mode is on, so the links stay as they are. Describe the links in the plan.') };
  if (ctx.mode === 'critique') return { result: failure('Links are not available in critique runs.') };
  try {
    const frames = await framesOf(ctx);
    const from = frameOf(frames, spec.fromFrame);
    const back = spec.toFrame.trim().toLowerCase() === BACK_REF;
    const to = back ? null : frameOf(frames, spec.toFrame);
    if (to && to.id === from.id) throw new LinkError('A link goes to another frame. Pick a different toFrame, or "back".');
    if (back && spec.action && spec.action !== 'navigate') throw new LinkError('A "back" link cannot open an overlay. Use action navigate, or a toFrame.');
    const selector = cleanLinkSelector(spec.selector);
    if (!selector) throw new LinkError('selector is empty or too long.');
    let hint: { tag?: string; text?: string } = {};
    if (probe) {
      const [found] = await probe(from, [{ id: 'new', selector }]).catch((error: unknown) => {
        throw new LinkError(`Could not render ${from.path || 'the entry page'} to check the selector: ${error instanceof Error ? error.message : String(error)}`);
      });
      if (!found) throw new LinkError(`No element matches ${selector} on ${from.path || 'the entry page'} of ${from.id}. Check the selector with get_frame_html.`);
      const label = cleanLinkText(found.text);
      hint = { tag: found.tag, ...(label ? { text: label } : {}) };
    }
    const transition: LinkTransition = spec.transition ?? 'instant';
    let saved: PrototypeLink | null = null;
    const file = await ctx.canvas.links.update(
      ctx.project,
      (current) => {
        const base: Omit<PrototypeLink, 'id'> = { from: { frame: from.id, path: from.path ?? '', selector, ...hint }, to: to ? { frame: to.id } : { back: true }, transition };
        const next = upsertLink(current, withMotion(base, { ...(spec.action ? { action: spec.action } : {}), ...(spec.duration !== undefined ? { duration: spec.duration } : {}), ...(spec.easing ? { easing: spec.easing } : {}) }));
        saved = next.link;
        return next.file;
      },
      'agent',
    );
    const link = saved as PrototypeLink | null;
    if (!link) throw new LinkError('The link was not saved.');
    const title = linkTitle(link, frames);
    return { result: text({ link: describeLink(link, frames, null, startFrameOf(file, frames)), links: file.links.length }), link, title };
  } catch (error) {
    if (error instanceof LinkError) return { result: failure(error.message) };
    throw error;
  }
}

export async function removeLink(ctx: CanvasToolContext, id: string): Promise<{ result: ToolText; title?: string }> {
  if (ctx.plan) return { result: failure('Plan mode is on, so the links stay as they are.') };
  if (ctx.mode === 'critique') return { result: failure('Links are not available in critique runs.') };
  const frames = await framesOf(ctx);
  let removed: PrototypeLink | null = null;
  await ctx.canvas.links.update(
    ctx.project,
    (file) => {
      removed = file.links.find((link) => link.id === id) ?? null;
      return removed ? { ...file, links: file.links.filter((link) => link.id !== id) } : null;
    },
    'agent',
  );
  const link = removed as PrototypeLink | null;
  if (!link) return { result: failure(`No link ${id}. Call list_links for the ids.`) };
  const title = linkTitle(link, frames);
  return { result: text({ removed: id, title }), title };
}

export async function setStartFrame(ctx: CanvasToolContext, ref: string): Promise<{ result: ToolText; frame?: CanvasFileFrame }> {
  if (ctx.plan) return { result: failure('Plan mode is on, so the links stay as they are.') };
  if (ctx.mode === 'critique') return { result: failure('Links are not available in critique runs.') };
  try {
    const frames = await framesOf(ctx);
    const frame = frameOf(frames, ref);
    await ctx.canvas.links.update(ctx.project, (file): LinksFile => ({ ...file, start: frame.id }), 'agent');
    return { result: text({ startFrame: frame.id, label: frame.label ?? null, note: 'Play in the studio starts at this frame.' }), frame };
  } catch (error) {
    if (error instanceof LinkError) return { result: failure(error.message) };
    throw error;
  }
}

export function frameLabel(frame: CanvasFileFrame): string {
  return frame.label ?? frame.path ?? frame.id;
}

export const editLinksShape = {
  add: z.array(linkSpecSchema).max(20).optional().describe('Links to add (or replace, for the same element).'),
  remove: z.array(z.string().regex(/^l\d{1,5}$/)).max(50).optional().describe('Link ids from list_links to remove.'),
  startFrame: frameRef.optional().describe('Frame id or @label where Play starts.'),
  keep: z.array(z.string().regex(/^(i[0-9a-z]{1,12}|all)$/)).max(50).optional().describe('Ids of implicit links (implicit: true in list_links, from <a href> between pages) to save as normal links, or ["all"]. Then add the same selector again to change its action or transition.'),
};

export interface EditLinksArgs {
  add?: LinkSpec[];
  remove?: string[];
  startFrame?: string;
  keep?: string[];
}

function firstText(result: ToolText): string {
  return result.content[0]?.text ?? '';
}

async function keepStep(ctx: CanvasToolContext, keep: string[] | undefined, probe?: LinkProbe): Promise<{ failed: boolean; line: string } | null> {
  if (!keep || keep.length === 0) return null;
  const done = await keepLinks(ctx, keep.includes('all') ? 'all' : keep, probe);
  return done.isError ? { failed: true, line: `Not kept: ${firstText(done)}` } : { failed: false, line: `Kept implicit links: ${firstText(done)}` };
}

export async function editLinks(ctx: CanvasToolContext, args: EditLinksArgs, probe?: LinkProbe): Promise<ToolText> {
  const lines: string[] = [];
  let failed = false;
  const kept = await keepStep(ctx, args.keep, probe);
  if (kept) {
    failed ||= kept.failed;
    lines.push(kept.line);
  }
  for (const spec of args.add ?? []) {
    const done = await addLink(ctx, spec, probe);
    failed ||= done.result.isError === true;
    lines.push(done.result.isError ? `Not linked: ${firstText(done.result)}` : `Linked ${done.title ?? ''} (${done.link?.id ?? ''})`);
  }
  for (const id of args.remove ?? []) {
    const done = await removeLink(ctx, id);
    failed ||= done.result.isError === true;
    lines.push(done.result.isError ? `Not removed: ${firstText(done.result)}` : `Removed ${done.title ?? id}`);
  }
  if (args.startFrame) {
    const done = await setStartFrame(ctx, args.startFrame);
    failed ||= done.result.isError === true;
    lines.push(done.result.isError ? `Start frame not set: ${firstText(done.result)}` : `Play starts at ${done.frame ? frameLabel(done.frame) : args.startFrame}`);
  }
  if (lines.length === 0) return failure('Pass add, remove, keep or startFrame.');
  return { content: [{ type: 'text', text: lines.join('\n') }], ...(failed ? { isError: true } : {}) };
}
