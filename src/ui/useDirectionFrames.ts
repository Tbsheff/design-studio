import { useEffect, useMemo, useRef, useState } from 'react';
import { BRIDGE_PASSIVE_PARAM, type Direction, type ProjectKind } from '../shared/contracts';
import { api } from './api';
import { frameSrc } from './bridge';
import { markOf, withElementMark } from './elementMark';
import { frameDirection, withFramePath, type CanvasFrame } from './canvasFrames';
import { randomToken } from './session';
import { useTokenFrames } from './tokenFrames';
import { passiveSrc } from './useCanvasFrames';
import type { FilesChange } from './useStudioData';
import { useSwapGate, type GateTarget } from './useSwapGate';

export interface PassiveSlot {
  id: string;
  directionId: string | null;
  token: string;
  src: string | null;
  nextSrc: string | null;
}

interface Options {
  projectId: string;
  kind: ProjectKind;
  frames: CanvasFrame[];
  activeId: string;
  currentId: string | null;
  currentUrl: string | null;
  live: boolean;
  lastChange: FilesChange | null;
  hold: boolean;
  directions: Direction[] | undefined;
}

function useDirectionUrls(projectId: string, ids: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const asked = useRef(new Set<string>());
  const key = ids.join(',');
  useEffect(() => {
    asked.current = new Set();
    setUrls({});
  }, [projectId]);
  useEffect(() => {
    for (const id of key ? key.split(',') : []) {
      if (asked.current.has(id)) continue;
      asked.current.add(id);
      api
        .directionPreview(projectId, id)
        .then(({ url }) => setUrls((prev) => ({ ...prev, [id]: url })))
        .catch(() => asked.current.delete(id));
    }
  }, [projectId, key]);
  return urls;
}

export function useDirectionFrames(o: Options) {
  const tokens = useRef(new Map<string, string>());
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const passive = o.frames.filter((f) => f.id !== o.activeId);
  const known = new Set(o.directions?.map((d) => d.id));
  const resolved = passive.map((f) => {
    const own = frameDirection(f, o.currentId);
    return { frame: f, directionId: own && (own === o.currentId || !o.directions || known.has(own)) ? own : o.currentId };
  });
  const others = [...new Set(resolved.map((r) => r.directionId).filter((id): id is string => id !== null && id !== o.currentId))].sort();
  const urls = useDirectionUrls(o.projectId, others);
  const heads = new Map(o.directions?.map((d) => [d.id, d.headVersionId]));
  const targets: GateTarget[] = resolved
    .filter((r) => r.directionId !== null && (r.directionId !== o.currentId || o.live))
    .map((r) => ({ key: r.frame.id, directionId: r.directionId as string, headVersionId: heads.get(r.directionId as string) ?? null }));
  const gate = useSwapGate(o.kind, targets, o.lastChange, o.hold, o.live ? o.currentId : null);

  const slots: PassiveSlot[] = resolved.map(({ frame, directionId }) => {
    const token = tokens.current.get(frame.id) ?? randomToken();
    tokens.current.set(frame.id, token);
    const isCurrent = directionId !== null && directionId === o.currentId;
    const base = directionId === null ? null : isCurrent ? o.currentUrl : withElementMark(urls[directionId] ?? null, markOf(o.directions, directionId));
    const gated = !isCurrent || o.live;
    const build = (change: FilesChange | null) => (base ? frameSrc(passiveSrc(withFramePath(base, frame.path), o.kind, change) as string, token, { [BRIDGE_PASSIVE_PARAM]: '1' }) : null);
    const src = build(gated ? gate.shownFor(frame.id) : null);
    const next = gated ? gate.nextFor(frame.id) : null;
    const nextSrc = next ? build(next) : null;
    return { id: frame.id, directionId, token, src, nextSrc: nextSrc === src ? null : nextSrc };
  });

  const slotKey = slots.map((s) => `${s.id}:${s.directionId === o.currentId ? s.src : ''}`).join('|');
  const tokenSlots = useMemo(
    () => slots.filter((s) => s.src && s.directionId === o.currentId).map((s) => ({ token: s.token, src: s.src as string })),
    [slotKey],
  );
  useTokenFrames(tokenSlots, elements, o.kind);
  return { slots, elements, onSwapDone: gate.onSwapDone };
}

export type DirectionFrames = ReturnType<typeof useDirectionFrames>;
