import { useEffect, useRef } from 'react';
import type { ZoomKey } from '../shared/contracts';
import type { ParentMessageBody } from './bridge';
import { setFrameHidden } from './canvasFrames';
import { useProjectEvents } from './events';
import type { CanvasFrames } from './useCanvasFrames';

const POINT_FRESH_MS = 8000;
const SELECT_AT_MS = [900, 1700];
const ZOOM_AT_MS = 500;

interface PointInput {
  projectId: string;
  frames: CanvasFrames;
  post: (body: ParentMessageBody) => void;
  clearSelection: () => void;
  zoom: (key: ZoomKey) => void;
}

export function useCanvasPoint(o: PointInput): void {
  const latest = useRef(o);
  latest.current = o;
  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );
  useProjectEvents(o.projectId, (event) => {
    if (event.type !== 'canvas.point' || Date.now() - event.at > POINT_FRESH_MS) return;
    const cur = latest.current;
    const frame = cur.frames.layout.frames.find((f) => f.id === event.frameId);
    if (!frame) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    if (frame.hidden) cur.frames.update((l) => setFrameHidden(l, frame.id, false));
    cur.frames.activate(frame);
    cur.clearSelection();
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    later(ZOOM_AT_MS, () => latest.current.zoom('selection'));
    if (event.selector) {
      const selector = event.selector;
      for (const ms of SELECT_AT_MS) later(ms, () => latest.current.post({ type: 'select-selector', selector }));
    }
  });
}
