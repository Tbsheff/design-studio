import { useSyncExternalStore } from 'react';
import type { Viewport } from './storage';

export interface CanvasFrame {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  directionId?: string;
  path?: string;
}

export interface CanvasLayout {
  frames: CanvasFrame[];
  activeId: string;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FramePreset {
  preset: Exclude<Viewport['preset'], 'custom'>;
  label: string;
  width: number;
  height: number;
}

export const FRAME_PRESETS: FramePreset[] = [
  { preset: 'desktop', label: 'Desktop 1440', width: 1440, height: 900 },
  { preset: 'tablet', label: 'Tablet 768', width: 768, height: 1024 },
  { preset: 'mobile', label: 'Mobile 390', width: 390, height: 844 },
];

export const FRAME_GAP = 80;
const MAX_FRAMES = 12;
const MIN_SIDE = 200;
export const RESIZE_MIN = 240;
const ROW_GAP = FRAME_GAP * 2;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const PATH_MAX = 200;
const MAX_SIDE = 4000;
const MAX_COORD = 100_000;
const KEY = 'design-studio.canvas.v1';

export function frameName(frame: Pick<CanvasFrame, 'width' | 'height'>): string {
  const preset = FRAME_PRESETS.find((p) => p.width === frame.width && p.height === frame.height);
  return preset ? preset.label : `${frame.width} × ${frame.height}`;
}

export function viewportOf(frame: Pick<CanvasFrame, 'width' | 'height'>): Viewport {
  const preset = FRAME_PRESETS.find((p) => p.width === frame.width && p.height === frame.height);
  return { preset: preset?.preset ?? 'custom', width: frame.width, height: frame.height };
}

export function defaultLayout(viewport: Viewport): CanvasLayout {
  return { frames: [{ id: 'f1', width: viewport.width, height: viewport.height, x: 0, y: 0 }], activeId: 'f1' };
}

export function activeFrame(layout: CanvasLayout): CanvasFrame {
  return layout.frames.find((f) => f.id === layout.activeId) ?? (layout.frames[0] as CanvasFrame);
}

export function boundsOf(frames: CanvasFrame[]): Box {
  if (frames.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...frames.map((f) => f.x));
  const top = Math.min(...frames.map((f) => f.y));
  const right = Math.max(...frames.map((f) => f.x + f.width));
  const bottom = Math.max(...frames.map((f) => f.y + f.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function nextId(frames: CanvasFrame[]): string {
  let n = frames.length + 1;
  while (frames.some((f) => f.id === `f${n}`)) n += 1;
  return `f${n}`;
}

export function canAddFrame(layout: CanvasLayout): boolean {
  return layout.frames.length < MAX_FRAMES;
}

export function addFrame(layout: CanvasLayout, size: { width: number; height: number }): CanvasLayout {
  if (!canAddFrame(layout)) return layout;
  const bounds = boundsOf(layout.frames);
  const frame: CanvasFrame = { id: nextId(layout.frames), width: size.width, height: size.height, x: bounds.x + bounds.width + FRAME_GAP, y: bounds.y };
  return { ...layout, frames: [...layout.frames, frame] };
}

export function moveFrame(layout: CanvasLayout, id: string, dx: number, dy: number): CanvasLayout {
  if (dx === 0 && dy === 0) return layout;
  return { ...layout, frames: layout.frames.map((f) => (f.id === id ? { ...f, x: Math.round(f.x + dx), y: Math.round(f.y + dy) } : f)) };
}

export function removeFrame(layout: CanvasLayout, id: string): CanvasLayout {
  if (layout.frames.length <= 1) return layout;
  const frames = layout.frames.filter((f) => f.id !== id);
  const activeId = layout.activeId === id ? (frames[0] as CanvasFrame).id : layout.activeId;
  return { frames, activeId };
}

export function resizeFrame(layout: CanvasLayout, id: string, width: number, height: number): CanvasLayout {
  const w = Math.round(Math.min(MAX_SIDE, Math.max(RESIZE_MIN, width)));
  const h = Math.round(Math.min(MAX_SIDE, Math.max(RESIZE_MIN, height)));
  const frame = layout.frames.find((f) => f.id === id);
  if (!frame || (frame.width === w && frame.height === h)) return layout;
  return { ...layout, frames: layout.frames.map((f) => (f.id === id ? { ...f, width: w, height: h } : f)) };
}

export function cleanFramePath(raw: string): string | null {
  const path = raw.trim().replace(/^\/+/, '');
  if (path === '') return '';
  if (path.length > PATH_MAX || /[\\\s#?:]|%2e|%2f|%5c/i.test(path)) return null;
  if (path.split('/').some((part) => part === '..' || part === '.')) return null;
  return path;
}

export function setFramePath(layout: CanvasLayout, id: string, raw: string): CanvasLayout {
  const path = cleanFramePath(raw);
  const frame = layout.frames.find((f) => f.id === id);
  if (path === null || !frame || (frame.path ?? '') === path) return layout;
  return { ...layout, frames: layout.frames.map((f) => (f.id !== id ? f : path ? { ...f, path } : withoutKey(f, 'path'))) };
}

export function withFramePath(url: string, path: string | undefined): string {
  if (!path) return url;
  const base = new URL(url, globalThis.location?.href);
  if (!base.pathname.endsWith('/')) base.pathname = base.pathname.replace(/[^/]*$/, '');
  const next = new URL(path, base);
  next.search = base.search;
  return next.toString();
}

function withoutKey<K extends 'path' | 'directionId'>(frame: CanvasFrame, key: K): CanvasFrame {
  const copy = { ...frame };
  delete copy[key];
  return copy;
}

export function frameDirection(frame: CanvasFrame, currentId: string | null): string | null {
  return frame.directionId ?? currentId;
}

export function placeDirections(layout: CanvasLayout, directionIds: string[], currentId: string | null, dropCurrent: boolean): CanvasLayout {
  const size = activeFrame(layout);
  let frames = layout.frames.map((f) => (f.directionId || !currentId ? f : { ...f, directionId: currentId }));
  if (dropCurrent && currentId && !directionIds.includes(currentId)) frames = frames.filter((f) => f.directionId !== currentId);
  const missing = directionIds.filter((id) => !frames.some((f) => f.directionId === id));
  const group = frames.filter((f) => f.directionId && directionIds.includes(f.directionId));
  const others = frames.filter((f) => !group.includes(f));
  const row = group.length > 0 ? boundsOf(group) : null;
  const rest = boundsOf(others);
  let x = row ? row.x + row.width + FRAME_GAP : rest.x;
  const y = row ? row.y : others.length > 0 ? rest.y + rest.height + ROW_GAP : 0;
  for (const id of missing) {
    if (frames.length >= MAX_FRAMES) break;
    frames = [...frames, { id: nextId(frames), width: size.width, height: size.height, x, y, directionId: id }];
    x += size.width + FRAME_GAP;
  }
  if (frames.length === 0) return layout;
  const activeId = frames.some((f) => f.id === layout.activeId) ? layout.activeId : (frames[0] as CanvasFrame).id;
  return { frames, activeId };
}

export function keepDirection(layout: CanvasLayout, keepId: string, groupIds: string[]): CanvasLayout {
  const frames = layout.frames.filter((f) => !f.directionId || f.directionId === keepId || !groupIds.includes(f.directionId));
  const kept = frames.find((f) => f.directionId === keepId);
  if (frames.length === 0) return layout;
  const activeId = kept?.id ?? (frames.some((f) => f.id === layout.activeId) ? layout.activeId : (frames[0] as CanvasFrame).id);
  if (frames.length === layout.frames.length && activeId === layout.activeId) return layout;
  return { frames, activeId };
}

export function followDirection(layout: CanvasLayout, currentId: string | null): CanvasLayout {
  const active = activeFrame(layout);
  if (!currentId || frameDirection(active, currentId) === currentId) return layout;
  const match = layout.frames.find((f) => f.directionId === currentId) ?? layout.frames.find((f) => !f.directionId);
  if (match) return { ...layout, activeId: match.id };
  return { ...layout, frames: layout.frames.map((f) => (f.id === active.id ? { ...f, directionId: currentId } : f)) };
}

export function resizeActive(layout: CanvasLayout, width: number, height: number): CanvasLayout {
  const active = activeFrame(layout);
  if (active.width === width && active.height === height) return layout;
  return { ...layout, frames: layout.frames.map((f) => (f.id === active.id ? { ...f, width, height } : f)) };
}

function isSide(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_SIDE && value <= MAX_SIDE;
}

function isCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_COORD;
}

export function parseLayout(raw: unknown): CanvasLayout | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.frames) || typeof record.activeId !== 'string') return null;
  const frames: CanvasFrame[] = [];
  for (const item of record.frames.slice(0, MAX_FRAMES)) {
    const f = item as Record<string, unknown>;
    if (typeof f.id !== 'string' || !/^f\d{1,4}$/.test(f.id) || frames.some((other) => other.id === f.id)) continue;
    if (!isSide(f.width) || !isSide(f.height) || !isCoord(f.x) || !isCoord(f.y)) continue;
    const frame: CanvasFrame = { id: f.id, width: f.width, height: f.height, x: f.x, y: f.y };
    if (typeof f.directionId === 'string' && ID_RE.test(f.directionId)) frame.directionId = f.directionId;
    const path = typeof f.path === 'string' ? cleanFramePath(f.path) : null;
    if (path) frame.path = path;
    frames.push(frame);
  }
  if (frames.length === 0) return null;
  const activeId = frames.some((f) => f.id === record.activeId) ? record.activeId : (frames[0] as CanvasFrame).id;
  return { frames, activeId };
}

function load(): Record<string, CanvasLayout> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>;
    const out: Record<string, CanvasLayout> = {};
    for (const [pid, value] of Object.entries(parsed)) {
      const layout = parseLayout(value);
      if (layout) out[pid] = layout;
    }
    return out;
  } catch {
    return {};
  }
}

let layouts: Record<string, CanvasLayout> | null = null;
const listeners = new Set<() => void>();

function all(): Record<string, CanvasLayout> {
  layouts ??= load();
  return layouts;
}

export const canvasStore = {
  get: (projectId: string): CanvasLayout | undefined => all()[projectId],
  set: (projectId: string, layout: CanvasLayout) => {
    layouts = { ...all(), [projectId]: layout };
    try {
      localStorage.setItem(KEY, JSON.stringify(layouts));
    } catch {
      void 0;
    }
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useCanvasLayout(projectId: string, viewport: Viewport): [CanvasLayout, (update: (layout: CanvasLayout) => CanvasLayout) => void] {
  const stored = useSyncExternalStore(canvasStore.subscribe, () => canvasStore.get(projectId));
  const layout = stored ?? defaultLayout(viewport);
  const update = (fn: (layout: CanvasLayout) => CanvasLayout) => {
    const current = canvasStore.get(projectId) ?? defaultLayout(viewport);
    const next = fn(current);
    if (next !== current) canvasStore.set(projectId, next);
  };
  return [layout, update];
}
