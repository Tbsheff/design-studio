import { useCallback, useEffect, useRef, useState } from 'react';
import type { McpPoint, ZoomKey } from '../shared/contracts';
import type { ParentMessageBody } from './bridge';
import { setFrameHidden } from './canvasFrames';
import { useProjectEvents } from './events';
import type { CanvasFrames } from './useCanvasFrames';

const POINT_FRESH_MS = 8000;
export const MCP_POINT_MS = 20_000;
const SELECT_AT_MS = [900, 1700];
const ZOOM_AT_MS = 500;

interface PointInput {
  projectId: string;
  frames: CanvasFrames;
  post: (body: ParentMessageBody) => void;
  clearSelection: () => void;
  zoom: (key: ZoomKey) => void;
}

export interface McpPointBadge {
  point: McpPoint | null;
  show: () => void;
  dismiss: () => void;
}

function useShowFrame(o: PointInput) {
  const latest = useRef(o);
  latest.current = o;
  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );
  return useCallback((frameId: string, selector: string | undefined): boolean => {
    const cur = latest.current;
    const frame = cur.frames.layout.frames.find((f) => f.id === frameId);
    if (!frame) return false;
    timers.current.forEach((t) => window.clearTimeout(t));
    if (frame.hidden) cur.frames.update((l) => setFrameHidden(l, frame.id, false));
    cur.frames.activate(frame);
    cur.clearSelection();
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    later(ZOOM_AT_MS, () => latest.current.zoom('selection'));
    if (selector) for (const ms of SELECT_AT_MS) later(ms, () => latest.current.post({ type: 'select-selector', selector }));
    return true;
  }, []);
}

export function useCanvasPoint(o: PointInput): McpPointBadge {
  const showFrame = useShowFrame(o);
  const [point, setPoint] = useState<McpPoint | null>(null);
  useProjectEvents(o.projectId, (event) => {
    if (event.type === 'canvas.point' && Date.now() - event.at <= POINT_FRESH_MS) showFrame(event.frameId, event.selector);
    if (event.type === 'mcp.point' && Date.now() - event.point.at < MCP_POINT_MS) setPoint(event.point);
  });
  useEffect(() => {
    if (!point) return;
    const timer = window.setTimeout(() => setPoint(null), Math.max(0, point.at + MCP_POINT_MS - Date.now()));
    return () => window.clearTimeout(timer);
  }, [point]);
  const show = useCallback(() => {
    if (point) showFrame(point.frameId, point.selector);
    setPoint(null);
  }, [point, showFrame]);
  const dismiss = useCallback(() => setPoint(null), []);
  return { point, show, dismiss };
}
