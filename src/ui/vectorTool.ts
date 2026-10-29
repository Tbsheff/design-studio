import { useEffect, useRef, useSyncExternalStore } from 'react';
import { vectorToolKeyOf, type VectorRequest, type VectorResult, type VectorToolId } from '../shared/vector';
import { json } from './api';
import { isTypingTarget } from './typingTarget';

export type { VectorToolId };
export const PREVIEW_TOOL_KEY_EVENT = 'studio:preview-tool-key';

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

export function useVectorToolKeys(available: boolean): void {
  useEffect(() => vectorTool.setAvailable(available), [available]);
  useEffect(() => () => vectorTool.setAvailable(false), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target) || document.querySelector('.play-bar')) return;
      const tool = vectorToolKeyOf(event);
      if (!tool || !vectorTool.get().available) return;
      event.preventDefault();
      vectorTool.toggle(tool);
    };
    const onForwarded = (event: Event) => {
      const tool = (event as CustomEvent<{ tool?: VectorToolId }>).detail?.tool;
      if (tool && vectorTool.get().available && !document.querySelector('.play-bar')) vectorTool.toggle(tool);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(PREVIEW_TOOL_KEY_EVENT, onForwarded);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PREVIEW_TOOL_KEY_EVENT, onForwarded);
    };
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
