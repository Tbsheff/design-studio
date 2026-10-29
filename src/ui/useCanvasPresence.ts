import { useEffect, useRef } from 'react';
import type { SelectionContext } from '../shared/contracts';
import { api } from './api';

const PRESENCE_MS = 1500;
const RESEND_MS = 60_000;

interface PresenceInput {
  projectId: string;
  directionId: string | null;
  activeId: string;
  liveSize: { width: number; height: number };
  selection: SelectionContext[];
  stage: () => HTMLElement | null;
}

export function inViewIds(stage: HTMLElement | null): string[] {
  if (!stage) return [];
  const box = stage.getBoundingClientRect();
  const ids: string[] = [];
  for (const el of stage.querySelectorAll<HTMLElement>('.artboard[data-frame-id], .canvas-frame[data-frame-id]')) {
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, box.right) - Math.max(r.left, box.left);
    const h = Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top);
    if (w <= 0 || h <= 0 || r.width <= 0 || r.height <= 0) continue;
    if ((w * h) / (r.width * r.height) >= 0.25 || (w * h) / (box.width * box.height) >= 0.25) ids.push(el.dataset.frameId as string);
  }
  return [...new Set(ids)].sort();
}

function presenceBody(o: PresenceInput) {
  return {
    directionId: o.directionId,
    activeFrameId: o.activeId,
    liveSize: { width: Math.round(o.liveSize.width), height: Math.round(o.liveSize.height) },
    inView: inViewIds(o.stage()),
    selection: o.selection.slice(0, 20).map((s) => ({ selector: s.selector.slice(0, 400), tag: s.tag.slice(0, 40), text: s.text.slice(0, 200) })),
  };
}

export function useCanvasPresence(o: PresenceInput): void {
  const latest = useRef(o);
  latest.current = o;
  useEffect(() => {
    let last = '';
    let sentAt = 0;
    const send = () => {
      if (document.hidden) return;
      const body = presenceBody(latest.current);
      const key = JSON.stringify(body);
      if (key === last && Date.now() - sentAt < RESEND_MS) return;
      last = key;
      sentAt = Date.now();
      api.putCanvasPresence(latest.current.projectId, body).catch(() => {
        last = '';
      });
    };
    send();
    const timer = window.setInterval(send, PRESENCE_MS);
    return () => window.clearInterval(timer);
  }, [o.projectId]);
  useEffect(() => {
    let stop: (() => void) | null = null;
    let gone = false;
    void import('./shareLive').then((mod) => {
      if (!gone) stop = mod.startShareLive(o.projectId, () => latest.current.stage());
    });
    return () => {
      gone = true;
      stop?.();
    };
  }, [o.projectId]);
}
