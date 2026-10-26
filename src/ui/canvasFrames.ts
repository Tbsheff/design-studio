import { useEffect, useSyncExternalStore } from 'react';
import { CANVAS_MAX_FRAMES, cleanFramePath, isFrameId, normalizeCanvasFile, serializeCanvasFile, type CanvasFile } from '../shared/canvas-file';
import type { StudioEvent } from '../shared/contracts';
import { ApiError, api } from './api';
import { useProjectEvents } from './events';
import type { Viewport } from './storage';

export { cleanFramePath } from '../shared/canvas-file';

export interface CanvasFrame {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  directionId?: string;
  path?: string;
  label?: string;
  hidden?: boolean;
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
const MAX_FRAMES = CANVAS_MAX_FRAMES;
const MIN_SIDE = 200;
export const RESIZE_MIN = 240;
const ROW_GAP = FRAME_GAP * 2;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_SIDE = 4000;
const MAX_COORD = 100_000;
const KEY = 'design-studio.canvas.v1';
const ACTIVE_KEY = 'design-studio.canvas.active.v1';
const MIGRATED_KEY = 'design-studio.canvas.migrated.v1';
const WRITE_DELAY_MS = 400;
const RETRY_MS = 2000;
const writerId = `w${Math.random().toString(36).slice(2, 12)}`;

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

export function shownFrames(layout: CanvasLayout): CanvasFrame[] {
  return layout.frames.filter((f) => !f.hidden || f.id === layout.activeId);
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
  const bounds = boundsOf(shownFrames(layout));
  const frame: CanvasFrame = { id: nextId(layout.frames), width: size.width, height: size.height, x: bounds.x + bounds.width + FRAME_GAP, y: bounds.y };
  return { ...layout, frames: [...layout.frames, frame] };
}

export function moveFrame(layout: CanvasLayout, id: string, dx: number, dy: number): CanvasLayout {
  if (dx === 0 && dy === 0) return layout;
  return { ...layout, frames: layout.frames.map((f) => (f.id === id ? { ...f, x: Math.round(f.x + dx), y: Math.round(f.y + dy) } : f)) };
}

function firstShown(frames: CanvasFrame[]): CanvasFrame {
  return frames.find((f) => !f.hidden) ?? (frames[0] as CanvasFrame);
}

export function removeFrame(layout: CanvasLayout, id: string): CanvasLayout {
  if (layout.frames.length <= 1) return layout;
  const frames = layout.frames.filter((f) => f.id !== id);
  const activeId = layout.activeId === id ? firstShown(frames).id : layout.activeId;
  return { frames, activeId };
}

export function canHideFrame(layout: CanvasLayout, id: string): boolean {
  return shownFrames(layout).some((f) => f.id !== id);
}

export function setFrameHidden(layout: CanvasLayout, id: string, hidden: boolean): CanvasLayout {
  const frame = layout.frames.find((f) => f.id === id);
  if (!frame || Boolean(frame.hidden) === hidden || (hidden && !canHideFrame(layout, id))) return layout;
  const frames = layout.frames.map((f) => (f.id !== id ? f : hidden ? { ...f, hidden: true } : withoutKey(f, 'hidden')));
  const activeId = hidden && layout.activeId === id ? firstShown(frames).id : layout.activeId;
  return { frames, activeId };
}

export function resizeFrame(layout: CanvasLayout, id: string, width: number, height: number): CanvasLayout {
  const w = Math.round(Math.min(MAX_SIDE, Math.max(RESIZE_MIN, width)));
  const h = Math.round(Math.min(MAX_SIDE, Math.max(RESIZE_MIN, height)));
  const frame = layout.frames.find((f) => f.id === id);
  if (!frame || (frame.width === w && frame.height === h)) return layout;
  return { ...layout, frames: layout.frames.map((f) => (f.id === id ? { ...f, width: w, height: h } : f)) };
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

function withoutKey<K extends 'path' | 'directionId' | 'hidden'>(frame: CanvasFrame, key: K): CanvasFrame {
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
  const others = frames.filter((f) => !group.includes(f) && !f.hidden);
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
  const match = layout.frames.find((f) => f.directionId === currentId && !f.hidden) ?? layout.frames.find((f) => !f.directionId && !f.hidden);
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
    if (!isFrameId(f.id) || frames.some((other) => other.id === f.id)) continue;
    if (!isSide(f.width) || !isSide(f.height) || !isCoord(f.x) || !isCoord(f.y)) continue;
    const frame: CanvasFrame = { id: f.id, width: f.width, height: f.height, x: Math.round(f.x), y: Math.round(f.y) };
    if (typeof f.directionId === 'string' && ID_RE.test(f.directionId)) frame.directionId = f.directionId;
    const path = typeof f.path === 'string' ? cleanFramePath(f.path) : null;
    if (path) frame.path = path;
    frames.push(frame);
  }
  if (frames.length === 0) return null;
  const activeId = frames.some((f) => f.id === record.activeId) ? record.activeId : (frames[0] as CanvasFrame).id;
  return { frames, activeId };
}

function readJson(key: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '{}') as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeJson(key: string, value: Record<string, unknown>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    void 0;
  }
}

function legacyLayout(projectId: string): CanvasLayout | null {
  if (readJson(MIGRATED_KEY)[projectId] === true) return null;
  return parseLayout(readJson(KEY)[projectId]);
}

function markMigrated(projectId: string): void {
  if (readJson(MIGRATED_KEY)[projectId] !== true) writeJson(MIGRATED_KEY, { ...readJson(MIGRATED_KEY), [projectId]: true });
  const legacy = readJson(KEY);
  if (!(projectId in legacy)) return;
  delete legacy[projectId];
  writeJson(KEY, legacy);
}

function storedActive(projectId: string): string | null {
  const value = readJson(ACTIVE_KEY)[projectId];
  return typeof value === 'string' ? value : null;
}

function saveActive(projectId: string, activeId: string): void {
  if (storedActive(projectId) === activeId) return;
  writeJson(ACTIVE_KEY, { ...readJson(ACTIVE_KEY), [projectId]: activeId });
}

export function toCanvasFile(layout: CanvasLayout | null, lofi: readonly string[]): CanvasFile {
  const frames = (layout?.frames ?? []).map((frame, order) => ({ ...frame, order }));
  return normalizeCanvasFile({ version: 1, frames, lofi: [...lofi] });
}

export function fromCanvasFile(file: CanvasFile, activeId: string | null): CanvasLayout | null {
  const frames: CanvasFrame[] = file.frames.map(({ order: _order, ...frame }) => frame);
  if (frames.length === 0) return null;
  const pick = frames.find((f) => f.id === activeId && !f.hidden) ?? firstShown(frames);
  return { frames: frames.map((f) => (f.id === pick.id && f.hidden ? withoutKey(f, 'hidden') : f)), activeId: pick.id };
}

interface Entry {
  layout: CanvasLayout | null;
  lofi: string[];
  hash: string | null;
  loaded: boolean;
  loading: Promise<void> | null;
  requestedAt: number;
  timer: number | null;
  writing: boolean;
  again: boolean;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function entryOf(projectId: string): Entry {
  let entry = entries.get(projectId);
  if (!entry) {
    entry = { layout: null, lofi: [], hash: null, loaded: false, loading: null, requestedAt: 0, timer: null, writing: false, again: false };
    entries.set(projectId, entry);
  }
  return entry;
}

function notify(): void {
  listeners.forEach((l) => l());
}

function fileText(entry: Pick<Entry, 'layout' | 'lofi'>): string {
  return serializeCanvasFile(toCanvasFile(entry.layout, entry.lofi));
}

function applySnapshot(projectId: string, canvas: CanvasFile | null, hash: string | null): void {
  const entry = entryOf(projectId);
  if (entry.timer !== null) window.clearTimeout(entry.timer);
  entry.timer = null;
  entry.again = false;
  entry.hash = hash;
  entry.lofi = canvas?.lofi ?? [];
  const active = entry.layout?.activeId ?? storedActive(projectId);
  entry.layout = canvas ? fromCanvasFile(canvas, active) : null;
  notify();
}

async function flush(projectId: string): Promise<void> {
  const entry = entryOf(projectId);
  entry.timer = null;
  if (entry.writing) {
    entry.again = true;
    return;
  }
  entry.writing = true;
  const sent = fileText(entry);
  let stale = false;
  try {
    const result = await api.putCanvas(projectId, { canvas: toCanvasFile(entry.layout, entry.lofi), baseHash: entry.hash, writer: writerId });
    entry.hash = result.hash;
  } catch (error) {
    stale = error instanceof ApiError && error.status === 409;
    if (!stale) console.error('[canvas] save failed', error);
    if (!stale && fileText(entry) === sent) entry.timer = window.setTimeout(() => void flush(projectId), RETRY_MS);
  } finally {
    entry.writing = false;
  }
  if (stale) {
    await reloadCanvas(projectId).catch((error: unknown) => console.error('[canvas] reload failed', error));
    return;
  }
  if (entry.again) {
    entry.again = false;
    void flush(projectId);
  }
}

function schedule(projectId: string): void {
  const entry = entryOf(projectId);
  if (entry.timer !== null) window.clearTimeout(entry.timer);
  entry.timer = window.setTimeout(() => void flush(projectId), WRITE_DELAY_MS);
}

async function migrate(projectId: string, legacy: CanvasLayout): Promise<void> {
  const entry = entryOf(projectId);
  entry.layout = legacy;
  notify();
  try {
    const result = await api.putCanvas(projectId, { canvas: toCanvasFile(legacy, entry.lofi), baseHash: entry.hash, writer: writerId, migrate: true });
    entry.hash = result.hash;
    markMigrated(projectId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) await reloadCanvas(projectId);
    else console.error('[canvas] migration failed', error);
  }
}

export async function reloadCanvas(projectId: string): Promise<void> {
  const entry = entryOf(projectId);
  entry.requestedAt = Date.now();
  const snapshot = await api.getCanvas(projectId);
  applySnapshot(projectId, snapshot.canvas, snapshot.hash);
  entry.loaded = true;
  const hasFrames = (snapshot.canvas?.frames.length ?? 0) > 0;
  const legacy = hasFrames ? null : legacyLayout(projectId);
  if (legacy) await migrate(projectId, legacy);
  else markMigrated(projectId);
}

function ensureLoaded(projectId: string): void {
  const entry = entryOf(projectId);
  if (entry.loaded || entry.loading) return;
  entry.loading = reloadCanvas(projectId)
    .catch((error: unknown) => console.error('[canvas] load failed', error))
    .finally(() => {
      entry.loading = null;
    });
}

export function receiveCanvasEvent(event: StudioEvent): void {
  if (event.type !== 'canvas.changed') return;
  const entry = entryOf(event.projectId);
  if (!entry.loaded || event.ts < entry.requestedAt) return;
  if (event.writer === writerId || event.hash === entry.hash) return;
  applySnapshot(event.projectId, event.canvas, event.hash);
}

export const canvasStore = {
  get: (projectId: string): CanvasLayout | undefined => entries.get(projectId)?.layout ?? undefined,
  lofi: (projectId: string): string[] => entries.get(projectId)?.lofi ?? NO_LOFI,
  loaded: (projectId: string): boolean => entries.get(projectId)?.loaded ?? false,
  load: ensureLoaded,
  set: (projectId: string, layout: CanvasLayout) => {
    const entry = entryOf(projectId);
    const before = fileText(entry);
    entry.layout = layout;
    saveActive(projectId, layout.activeId);
    notify();
    if (entry.loaded && fileText(entry) !== before) schedule(projectId);
  },
  setLofi: (projectId: string, directionId: string, on: boolean, fallback: CanvasLayout) => {
    const entry = entryOf(projectId);
    if (!entry.loaded || entry.lofi.includes(directionId) === on) return;
    entry.lofi = on ? [...entry.lofi, directionId].sort() : entry.lofi.filter((id) => id !== directionId);
    entry.layout ??= fallback;
    notify();
    schedule(projectId);
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

const NO_LOFI: string[] = [];

export function useCanvasLayout(projectId: string, viewport: Viewport): [CanvasLayout, (update: (layout: CanvasLayout) => CanvasLayout) => void] {
  useEffect(() => canvasStore.load(projectId), [projectId]);
  useProjectEvents(projectId, receiveCanvasEvent);
  const stored = useSyncExternalStore(canvasStore.subscribe, () => canvasStore.get(projectId));
  const layout = stored ?? defaultLayout(viewport);
  const update = (fn: (layout: CanvasLayout) => CanvasLayout) => {
    const current = canvasStore.get(projectId) ?? defaultLayout(viewport);
    const next = fn(current);
    if (next !== current) canvasStore.set(projectId, next);
  };
  return [layout, update];
}

export function useCanvasLofi(projectId: string): string[] {
  return useSyncExternalStore(canvasStore.subscribe, () => canvasStore.lofi(projectId));
}
