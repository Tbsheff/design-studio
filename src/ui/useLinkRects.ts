import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { BridgeToParent, ProjectKind } from '../shared/contracts';
import { staticLinkIssue, type LinkIssue, type LinkQuery, type LinkRectReport, type LinksFile, type PrototypeLink } from '../shared/links';
import { postToFrame, useBridge, type BridgeFrame } from './bridge';
import type { CanvasFrame } from './canvasFrames';

type Rect = NonNullable<LinkRectReport['rect']>;

export interface LinkState {
  link: PrototypeLink;
  rect: Rect | null;
  issue: LinkIssue | null;
}

interface FrameSlot {
  frameId: string;
  token: string;
  src: string;
  element: HTMLIFrameElement | null;
}

interface Options {
  kind: ProjectKind;
  file: LinksFile;
  frames: CanvasFrame[];
  enabled: boolean;
  active: { frameId: string; token: string | null; src: string | null; elements: MutableRefObject<Record<string, HTMLIFrameElement | null>> };
  passive: { slots: { id: string; token: string; src: string | null }[]; elements: MutableRefObject<Record<string, HTMLIFrameElement | null>> };
}

export function linkQuery(link: PrototypeLink): LinkQuery {
  return { id: link.id, selector: link.from.selector, ...(link.from.tag ? { tag: link.from.tag } : {}), ...(link.from.text ? { text: link.from.text } : {}) };
}

function slotsOf(o: Options): FrameSlot[] {
  const list: FrameSlot[] = [];
  if (o.active.token && o.active.src) list.push({ frameId: o.active.frameId, token: o.active.token, src: o.active.src, element: o.active.elements.current[o.active.token] ?? null });
  for (const slot of o.passive.slots) {
    if (!slot.src || slot.id === o.active.frameId) continue;
    list.push({ frameId: slot.id, token: slot.token, src: slot.src, element: o.passive.elements.current[slot.token] ?? null });
  }
  return list;
}

function bridgeFrame(slot: FrameSlot, kind: ProjectKind): BridgeFrame {
  return { key: slot.frameId, token: slot.token, url: slot.src, kind, element: slot.element };
}

export function useLinkRects(o: Options): LinkState[] {
  const [reports, setReports] = useState<Record<string, { token: string; rects: Record<string, Rect | null> }>>({});
  const queriesOf = (frameId: string): LinkQuery[] => (o.enabled ? o.file.links.filter((link) => link.from.frame === frameId && staticLinkIssue(link, o.frames) === null).map(linkQuery) : []);
  const slots = slotsOf(o);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const queriesRef = useRef(queriesOf);
  queriesRef.current = queriesOf;
  const posted = useRef(new Map<string, { element: HTMLIFrameElement | null; token: string; text: string }>());

  const send = (slot: FrameSlot, force: boolean) => {
    const queries = queriesRef.current(slot.frameId);
    const text = JSON.stringify(queries);
    const last = posted.current.get(slot.frameId);
    if (!force && last && last.element === slot.element && last.token === slot.token && last.text === text) return;
    posted.current.set(slot.frameId, { element: slot.element, token: slot.token, text });
    postToFrame(bridgeFrame(slot, o.kind), { type: 'track-links', links: queries });
  };

  useEffect(() => {
    for (const slot of slotsRef.current) send(slot, false);
  });

  useBridge(
    () => slotsRef.current.map((slot) => bridgeFrame(slot, o.kind)),
    (frame, message: BridgeToParent) => {
      const slot = slotsRef.current.find((item) => item.frameId === frame.key);
      if (!slot) return;
      if (message.type === 'ready') send(slot, true);
      if (message.type !== 'link-rects') return;
      const rects: Record<string, Rect | null> = {};
      for (const report of Array.isArray(message.links) ? message.links : []) if (typeof report?.id === 'string') rects[report.id] = report.rect ?? null;
      setReports((prev) => ({ ...prev, [frame.key]: { token: frame.token, rects } }));
    },
  );

  return o.file.links.map((link) => {
    const issue = staticLinkIssue(link, o.frames);
    if (issue) return { link, rect: null, issue };
    const report = reports[link.from.frame];
    const slot = slots.find((item) => item.frameId === link.from.frame);
    if (!report || !slot || report.token !== slot.token || !(link.id in report.rects)) return { link, rect: null, issue: null };
    const rect = report.rects[link.id] ?? null;
    return { link, rect, issue: rect ? null : 'element-missing' };
  });
}
