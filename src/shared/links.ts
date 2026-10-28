import { cleanFramePath, isFrameId, type CanvasFileFrame } from './canvas-file.js';

export const LINKS_FILE = '.studio/links.json';
export const LINKS_FILE_VERSION = 1;
export const LINKS_MAX = 200;
export const LINK_SELECTOR_MAX = 400;
export const LINK_TEXT_MAX = 80;
export const LINK_TRANSITIONS = ['instant', 'dissolve', 'slide-left', 'slide-right'] as const;

export type LinkTransition = (typeof LINK_TRANSITIONS)[number];

export interface LinkSource {
  frame: string;
  path: string;
  selector: string;
  tag?: string;
  text?: string;
}

export type LinkTarget = { frame: string } | { back: true };

export interface PrototypeLink {
  id: string;
  from: LinkSource;
  to: LinkTarget;
  transition: LinkTransition;
}

export interface LinksFile {
  version: number;
  start?: string;
  links: PrototypeLink[];
}

export type LinkIssue = 'from-frame-missing' | 'to-frame-missing' | 'page-changed' | 'element-missing';

export const LINK_ISSUE_TEXT: Record<LinkIssue, string> = {
  'from-frame-missing': 'The frame with the element is gone.',
  'to-frame-missing': 'The target frame is gone.',
  'page-changed': 'The frame shows another page now.',
  'element-missing': 'The linked element is gone.',
};

const LINK_ID_RE = /^l\d{1,5}$/;
const TAG_RE = /^[a-z][a-z0-9-]{0,40}$/;

export function emptyLinksFile(): LinksFile {
  return { version: LINKS_FILE_VERSION, links: [] };
}

export function isLinkId(value: unknown): value is string {
  return typeof value === 'string' && LINK_ID_RE.test(value);
}

export function isLinkTransition(value: unknown): value is LinkTransition {
  return typeof value === 'string' && (LINK_TRANSITIONS as readonly string[]).includes(value);
}

export function isBackTarget(target: LinkTarget): target is { back: true } {
  return 'back' in target;
}

export function cleanLinkSelector(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const selector = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return selector === '' || selector.length > LINK_SELECTOR_MAX ? null : selector;
}

export function cleanLinkText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LINK_TEXT_MAX);
  return text === '' ? null : text;
}

function parseSource(raw: unknown): LinkSource | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const selector = cleanLinkSelector(s.selector);
  const path = typeof s.path === 'string' ? cleanFramePath(s.path) : '';
  if (!isFrameId(s.frame) || !selector || path === null) return null;
  const source: LinkSource = { frame: s.frame, path, selector };
  if (typeof s.tag === 'string' && TAG_RE.test(s.tag)) source.tag = s.tag;
  const text = cleanLinkText(s.text);
  if (text) source.text = text;
  return source;
}

function parseTarget(raw: unknown): LinkTarget | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  if (t.back === true) return { back: true };
  return isFrameId(t.frame) ? { frame: t.frame } : null;
}

export function parseLink(raw: unknown): PrototypeLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const l = raw as Record<string, unknown>;
  const from = parseSource(l.from);
  const to = parseTarget(l.to);
  if (!isLinkId(l.id) || !from || !to) return null;
  return { id: l.id, from, to, transition: isLinkTransition(l.transition) ? l.transition : 'instant' };
}

export function sourceKey(from: Pick<LinkSource, 'frame' | 'selector' | 'text'>): string {
  return `${from.frame}\u0000${from.selector}\u0000${from.text ?? ''}`;
}

function idNumber(id: string): number {
  return Number(id.slice(1));
}

export function normalizeLinksFile(file: LinksFile): LinksFile {
  const seen = new Set<string>();
  const sources = new Set<string>();
  const links = [...file.links]
    .sort((a, b) => idNumber(a.id) - idNumber(b.id))
    .filter((link) => {
      const key = sourceKey(link.from);
      if (seen.has(link.id) || sources.has(key)) return false;
      seen.add(link.id);
      sources.add(key);
      return true;
    })
    .slice(0, LINKS_MAX);
  return { version: LINKS_FILE_VERSION, ...(file.start && isFrameId(file.start) ? { start: file.start } : {}), links };
}

export function parseLinksFile(raw: unknown): LinksFile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.links)) return null;
  const links = record.links.map(parseLink).filter((link): link is PrototypeLink => link !== null);
  return normalizeLinksFile({ version: LINKS_FILE_VERSION, ...(isFrameId(record.start) ? { start: record.start } : {}), links });
}

export function parseLinksText(text: string): LinksFile | null {
  try {
    return parseLinksFile(JSON.parse(text));
  } catch {
    return null;
  }
}

function sortedValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) out[key] = sortedValue(item);
    }
    return out;
  }
  return value;
}

export function serializeLinksFile(file: LinksFile): string {
  return `${JSON.stringify(sortedValue(normalizeLinksFile(file)), null, 2)}\n`;
}

export function nextLinkId(links: readonly { id: string }[]): string {
  const max = links.reduce((top, link) => Math.max(top, idNumber(link.id)), 0);
  return `l${max + 1}`;
}

export function upsertLink(file: LinksFile, link: Omit<PrototypeLink, 'id'>): { file: LinksFile; link: PrototypeLink } {
  const key = sourceKey(link.from);
  const same = file.links.find((item) => sourceKey(item.from) === key);
  const saved: PrototypeLink = { ...link, id: same?.id ?? nextLinkId(file.links) };
  const links = same ? file.links.map((item) => (item.id === same.id ? saved : item)) : [...file.links, saved];
  return { file: { ...file, links }, link: saved };
}

type FrameLike = Pick<CanvasFileFrame, 'id'> & { path?: string };

export function knownFrames(frames: readonly FrameLike[]): readonly FrameLike[] {
  return frames.length > 0 ? frames : [{ id: 'f1' }];
}

export function staticLinkIssue(link: PrototypeLink, frames: readonly FrameLike[]): LinkIssue | null {
  const all = knownFrames(frames);
  const from = all.find((frame) => frame.id === link.from.frame);
  if (!from) return 'from-frame-missing';
  if (!isBackTarget(link.to)) {
    const target = link.to.frame;
    if (!all.some((frame) => frame.id === target)) return 'to-frame-missing';
  }
  if ((from.path ?? '') !== link.from.path) return 'page-changed';
  return null;
}

export function startFrameOf(file: LinksFile | null, frames: readonly FrameLike[]): string {
  const all = knownFrames(frames);
  const start = file?.start;
  if (start && all.some((frame) => frame.id === start)) return start;
  return all[0]?.id ?? 'f1';
}

export function transitionLabel(transition: LinkTransition): string {
  return { instant: 'Instant', dissolve: 'Dissolve', 'slide-left': 'Slide left', 'slide-right': 'Slide right' }[transition];
}

export function reverseTransition(transition: LinkTransition): LinkTransition {
  if (transition === 'slide-left') return 'slide-right';
  if (transition === 'slide-right') return 'slide-left';
  return transition;
}

export interface LinkQuery {
  id: string;
  selector: string;
  tag?: string;
  text?: string;
}

export interface LinkRectReport {
  id: string;
  rect: { x: number; y: number; width: number; height: number } | null;
}

export function normalizedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, LINK_TEXT_MAX);
}

export function textAgrees(actual: string, stored: string | undefined): boolean {
  if (!stored) return true;
  const a = normalizedText(actual);
  const b = normalizedText(stored);
  return a === b || (b.length >= 12 && a.startsWith(b));
}

export function isIdSelector(selector: string): boolean {
  return /^#[A-Za-z_][\w-]*$/.test(selector);
}
