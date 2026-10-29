import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { VectorRequest, VectorResult } from '../shared/vector';
import { json } from './api';
import { isTypingTarget } from './typingTarget';

export type VectorToolId = 'rect' | 'ellipse' | 'pen';

interface State {
  tool: VectorToolId | null;
  available: boolean;
}

let state: State = { tool: null, available: false };
const listeners = new Set<() => void>();

function emit(next: Partial<State>): void {
  state = { ...state, ...next };
  if (!state.available) state = { ...state, tool: null };
  for (const listener of listeners) listener();
}

export const vectorTool = {
  get: () => state,
  set: (tool: VectorToolId | null) => emit({ tool: state.available ? tool : null }),
  toggle: (tool: VectorToolId) => emit({ tool: state.available && state.tool !== tool ? tool : null }),
  setAvailable: (available: boolean) => {
    if (available !== state.available) emit({ available });
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useVectorTool(): State {
  return useSyncExternalStore(vectorTool.subscribe, vectorTool.get, vectorTool.get);
}

export const VECTOR_TOOLS: { id: VectorToolId; label: string; key: string; keyLabel: string; glyph: string }[] = [
  { id: 'rect', label: 'Rectangle', key: 'r', keyLabel: 'R', glyph: 'M2.75 3.75h10.5v8.5H2.75z' },
  { id: 'ellipse', label: 'Ellipse', key: 'o', keyLabel: 'O', glyph: 'M8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z' },
  { id: 'pen', label: 'Pen', key: 'P', keyLabel: '⇧P', glyph: 'M8 2.5 12.5 9 8 13.5 3.5 9zM8 2.5v5.25M8 9.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z' },
];

function toolForKey(event: KeyboardEvent): VectorToolId | null {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return null;
  if (event.key === 'P' && event.shiftKey) return 'pen';
  if (event.shiftKey) return null;
  const key = event.key.toLowerCase();
  return key === 'r' ? 'rect' : key === 'o' ? 'ellipse' : null;
}

export function useVectorToolKeys(available: boolean): void {
  useEffect(() => vectorTool.setAvailable(available), [available]);
  useEffect(() => () => vectorTool.setAvailable(false), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target) || document.querySelector('.play-bar')) return;
      const tool = toolForKey(event);
      if (!tool || !vectorTool.get().available) return;
      event.preventDefault();
      vectorTool.toggle(tool);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function useVectorToolGuards(tool: VectorToolId | null, otherOn: boolean, stopOthers: () => void): void {
  const stop = useRef(stopOthers);
  stop.current = stopOthers;
  useEffect(() => {
    if (tool) stop.current();
  }, [tool]);
  useEffect(() => {
    if (otherOn) vectorTool.set(null);
  }, [otherOn]);
}

export function runVector(projectId: string, directionId: string, request: VectorRequest): Promise<VectorResult> {
  return json<VectorResult>('POST', `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/vector`, request);
}
