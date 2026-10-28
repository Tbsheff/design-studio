import { useState, useSyncExternalStore } from 'react';
import type { Project, RunCanvasRef, SelectionContext } from '../shared/contracts';
import { stateLabel } from '../shared/frame-state';
import { activeFrame, canvasStore, defaultLayout, type CanvasFrame } from './canvasFrames';
import { frameStateOf, useFrameStates } from './frameStates';
import { uiStore } from './storage';
import { inViewIds } from './useCanvasPresence';

export interface RunCanvasChip {
  frameId: string;
  page: string;
  element: string | null;
  state: string | null;
  onRemove: () => void;
}

export interface RunCanvas {
  chip: RunCanvasChip | null;
  current: () => RunCanvasRef | undefined;
}

function frameKey(frame: CanvasFrame): string {
  return `${frame.id}|${frame.path ?? ''}`;
}

function pageName(frame: CanvasFrame, project: Pick<Project, 'kind' | 'entry'> | null): string {
  const html = project?.kind === 'html';
  if (frame.path) return html ? frame.path : `/${frame.path}`;
  return html ? project?.entry || 'index.html' : '/';
}

function elementName(selection: readonly SelectionContext[]): string | null {
  const first = selection[0];
  if (!first) return null;
  return first.component ?? first.usedBy?.name ?? first.tag;
}

function stage(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.stage[aria-label="Canvas"]');
}

function refOf(frame: CanvasFrame): RunCanvasRef {
  const inView = inViewIds(stage()).filter((id) => id !== frame.id);
  return { frameId: frame.id, path: frame.path ?? '', width: frame.width, height: frame.height, ...(frame.label ? { label: frame.label } : {}), ...(inView.length ? { inView } : {}) };
}

export function useRunCanvas(projectId: string, project: Project | null, selection: readonly SelectionContext[]): RunCanvas {
  const stored = useSyncExternalStore(canvasStore.subscribe, () => canvasStore.get(projectId));
  const frame = activeFrame(stored ?? defaultLayout(uiStore.get().viewport));
  const states = useFrameStates(projectId, Boolean(project?.app));
  const [removed, setRemoved] = useState<string | null>(null);
  const key = frameKey(frame);
  const off = removed === key;
  const chip = off
    ? null
    : { frameId: frame.id, page: pageName(frame, project), element: elementName(selection), state: stateLabel(states ?? null, frameStateOf(states ?? null, frame.id)), onRemove: () => setRemoved(key) };
  return { chip, current: () => (off ? undefined : refOf(frame)) };
}
