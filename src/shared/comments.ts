import type { AnchorMatch, AnchorQuery, CommentFrame, CommentStatus, CommentTarget, DesignComment, DrawStroke, SelectionContext, SourceLoc } from './contracts.js';

export const COMMENT_TEXT_MAX = 2000;
export const COMMENT_REPLIES_MAX = 50;
export const DRAW_STROKES_MAX = 200;
export const DRAW_POINTS_MAX = 20_000;
const TEXT_SNIPPET_MAX = 80;

export type CommentActor = 'user' | 'server';

const USER_TRANSITIONS: Record<CommentStatus, readonly CommentStatus[]> = {
  draft: ['queued', 'orphaned', 'resolved'],
  queued: ['orphaned', 'resolved'],
  sent: [],
  resolved: ['queued'],
  orphaned: ['queued', 'resolved'],
};

const SERVER_TRANSITIONS: Record<CommentStatus, readonly CommentStatus[]> = {
  draft: ['sent', 'queued'],
  queued: ['sent'],
  sent: ['resolved', 'queued'],
  resolved: [],
  orphaned: [],
};

export function canTransition(from: CommentStatus, to: CommentStatus, actor: CommentActor): boolean {
  if (from === to) return true;
  const table = actor === 'user' ? USER_TRANSITIONS : SERVER_TRANSITIONS;
  return table[from].includes(to);
}

export function isSendable(status: CommentStatus): boolean {
  return status === 'queued' || status === 'draft';
}

export function canOrphan(status: CommentStatus): boolean {
  return status === 'queued' || status === 'draft';
}

export function hasPin(status: CommentStatus): boolean {
  return status === 'queued' || status === 'draft' || status === 'sent';
}

export function statusAfterRun(runStatus: string): 'resolved' | 'queued' {
  return runStatus === 'completed' ? 'resolved' : 'queued';
}

export function formatLoc(loc: SourceLoc | null | undefined): string | null {
  return loc ? `${loc.file}:${loc.line}:${loc.col}` : null;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function snippetOf(text: string): string {
  return normalizeText(text).slice(0, TEXT_SNIPPET_MAX);
}

export function targetFromSelection(selection: SelectionContext): CommentTarget {
  return {
    selector: selection.selector,
    sourceLoc: selection.source,
    tag: selection.tag,
    textSnippet: snippetOf(selection.text),
    rectHint: selection.rect,
  };
}

export function anchorQueryOf(comment: Pick<DesignComment, 'id' | 'target'>): AnchorQuery {
  return {
    id: comment.id,
    selector: comment.target.selector,
    sourceLoc: formatLoc(comment.target.sourceLoc),
    tag: comment.target.tag,
    textSnippet: comment.target.textSnippet,
  };
}

export interface AnchorDom<E> {
  bySource(loc: string): E[];
  bySelector(selector: string): E | null;
  byTag(tag: string): E[];
  tagOf(element: E): string;
  textOf(element: E): string;
}

interface AnchorResolution<E> {
  element: E;
  via: AnchorMatch;
}

function textMatches(text: string, snippet: string): boolean {
  if (!snippet) return false;
  const clean = normalizeText(text);
  return clean === snippet || (snippet.length >= TEXT_SNIPPET_MAX && clean.startsWith(snippet));
}

function only<E>(items: E[]): E | null {
  return items.length === 1 ? (items[0] ?? null) : null;
}

function bySourceLoc<E>(query: AnchorQuery, dom: AnchorDom<E>, sameTag: (element: E) => boolean): E | null {
  if (!query.sourceLoc) return null;
  const candidates = dom.bySource(query.sourceLoc).filter(sameTag);
  if (candidates.length <= 1) return candidates[0] ?? null;
  const bySelector = dom.bySelector(query.selector);
  if (bySelector !== null && candidates.includes(bySelector)) return bySelector;
  return only(candidates.filter((element) => textMatches(dom.textOf(element), query.textSnippet)));
}

function byText<E>(query: AnchorQuery, dom: AnchorDom<E>): E | null {
  if (!query.textSnippet) return null;
  return dom.byTag(query.tag.toLowerCase()).find((element) => textMatches(dom.textOf(element), query.textSnippet)) ?? null;
}

export function resolveAnchor<E>(query: AnchorQuery, dom: AnchorDom<E>): AnchorResolution<E> | null {
  const tag = query.tag.toLowerCase();
  const sameTag = (element: E): boolean => dom.tagOf(element).toLowerCase() === tag;
  const source = bySourceLoc(query, dom, sameTag);
  if (source !== null) return { element: source, via: 'source' };
  const found = dom.bySelector(query.selector);
  const selector = found !== null && sameTag(found) ? found : null;
  const textAgrees = selector !== null && (!query.textSnippet || textMatches(dom.textOf(selector), query.textSnippet));
  if (selector !== null && textAgrees) return { element: selector, via: 'selector' };
  const text = byText(query, dom);
  if (text !== null) return { element: text, via: 'text' };
  return selector !== null ? { element: selector, via: 'selector' } : null;
}

export interface OrphanTracker {
  observe(id: string, found: boolean, now: number): boolean;
  forget(id: string): void;
}

export function createOrphanTracker(graceMs: number): OrphanTracker {
  const missingSince = new Map<string, number>();
  return {
    observe(id, found, now) {
      if (found) {
        missingSince.delete(id);
        return false;
      }
      const since = missingSince.get(id);
      if (since === undefined) {
        missingSince.set(id, now);
        return false;
      }
      return now - since >= graceMs;
    },
    forget(id) {
      missingSince.delete(id);
    },
  };
}

export function commentPrompt(comments: { n: number; text: string }[]): string {
  const lines = comments.map((comment) => `#${comment.n} ${normalizeText(comment.text)}`);
  const noun = comments.length === 1 ? 'comment' : 'comments';
  return [`Address ${comments.length} ${noun}:`, ...lines].join('\n');
}

export function agentText(comment: Pick<DesignComment, 'text' | 'replies'>): string {
  const replies = comment.replies ?? [];
  if (replies.length === 0) return comment.text;
  return [comment.text, 'Replies:', ...replies.map((reply) => `- ${normalizeText(reply.text)}`)].join('\n');
}

export function strokesBox(strokes: DrawStroke[]): SelectionContext['rect'] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    const pad = stroke.width / 2;
    for (let i = 0; i + 1 < stroke.points.length; i += 2) {
      const x = stroke.points[i] as number;
      const y = stroke.points[i + 1] as number;
      minX = Math.min(minX, x - pad);
      minY = Math.min(minY, y - pad);
      maxX = Math.max(maxX, x + pad);
      maxY = Math.max(maxY, y + pad);
    }
  }
  if (minX === Infinity) return null;
  return { x: Math.round(minX), y: Math.round(minY), width: Math.round(maxX - minX), height: Math.round(maxY - minY) };
}

export function drawingTarget(box: SelectionContext['rect']): CommentTarget {
  return { selector: 'body', sourceLoc: null, tag: 'body', textSnippet: '', rectHint: box };
}

export const CHAT_IMAGE_MAX = 4;

export function canPickForChat(status: CommentStatus): boolean {
  return status === 'draft' || status === 'queued' || status === 'orphaned';
}

export function frameText(frame: CommentFrame | undefined): string {
  if (!frame) return 'entry page (/)';
  const page = `/${frame.path.replace(/^\/+/, '')}`;
  return frame.label ? `${frame.label} (${page})` : page;
}

function elementWhere(comment: Pick<DesignComment, 'target' | 'context'>): string[] {
  const context = comment.context;
  const loc = context?.source ?? comment.target.sourceLoc ?? null;
  const parts = [`selector ${context?.selector ?? comment.target.selector}`];
  if (loc) parts.push(`source ${loc.file}:${loc.line}`);
  const component = context?.usedBy?.name ?? context?.component ?? context?.owners?.[0]?.name;
  if (component) parts.push(`in <${component}>`);
  if (context?.usedAt) parts.push(`used at ${context.usedAt.file}:${context.usedAt.line}`);
  return parts;
}

function drawingWhere(drawing: NonNullable<DesignComment['drawing']>): string[] {
  const { box } = drawing;
  return [`drawing ${box.width} × ${box.height} at ${box.x}, ${box.y}`];
}

export function describeComment(comment: DesignComment): string {
  const head = `#${comment.n}${comment.author ? ` (from ${comment.author})` : ''}: ${normalizeText(comment.text)}`;
  const where = comment.drawing ? drawingWhere(comment.drawing) : elementWhere(comment);
  const snippet = comment.target.textSnippet ? ` "${comment.target.textSnippet}"` : '';
  const lines = [head, `   ${comment.target.tag}${snippet} · ${where.join(' · ')}`, `   frame ${frameText(comment.frame)}`];
  for (const reply of comment.replies ?? []) lines.push(`   reply${reply.author ? ` from ${reply.author}` : ''}: ${normalizeText(reply.text)}`);
  return lines.join('\n');
}

export function chatPrompt(comments: DesignComment[], notes: string[] = []): string {
  const head = comments.length === 1 ? 'Fix this comment. Change only what it asks for.' : `Fix these ${comments.length} comments. Change only what each one asks for.`;
  return [head, ...comments.map(describeComment), ...notes].join('\n');
}

function normPath(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function isEntry(ref: string): boolean {
  const path = normPath(ref);
  return path === '' || /^index\.html?$/i.test(path);
}

function samePage(a: string, b: string): boolean {
  return normPath(a) === normPath(b) || (isEntry(a) && isEntry(b));
}

export function matchesFrame(comment: Pick<DesignComment, 'frame'>, ref: string, canvasFrame?: CommentFrame | null): boolean {
  const frame = comment.frame ?? { path: '' };
  if (canvasFrame) return frame.id ? frame.id === canvasFrame.id : samePage(frame.path, canvasFrame.path);
  const want = ref.trim();
  if (want.startsWith('@')) return frame.label?.toLowerCase() === want.slice(1).toLowerCase();
  return frame.id === want || samePage(frame.path, want);
}

export type CommentFilter = 'open' | 'all' | CommentStatus;

export function filterComments(comments: DesignComment[], status: CommentFilter = 'open', frame?: string, canvasFrame?: CommentFrame | null): DesignComment[] {
  return comments.filter((comment) => {
    const statusOk = status === 'all' || (status === 'open' ? comment.status !== 'resolved' : comment.status === status);
    return statusOk && (!frame || matchesFrame(comment, frame, canvasFrame));
  });
}

export function commentsDone(text: string): number[] | null {
  const line = /Done:([^\n]*)/i.exec(text);
  if (!line) return null;
  const match = /^\s*((?:#\d+(?:\s*,\s*|\s+and\s+|\s*))+)/.exec(line[1] ?? '');
  if (!match?.[1]) return [];
  return [...new Set([...match[1].matchAll(/#(\d+)/g)].map((m) => Number(m[1])))];
}
