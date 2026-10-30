import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { BRIDGE_PASSIVE_PARAM, type BridgeToParent, type LinkRect, type ProjectKind } from '../../shared/contracts';
import { easingCss, isBackTarget, linkDuration, LINK_DURATION_DEFAULT, reverseTransition, staticLinkIssue, type LinksFile, type LinkTransition, type PrototypeLink } from '../../shared/links';
import { frameSrc, postToFrame, useBridge, type BridgeFrame } from '../bridge';
import type { CanvasFrame } from '../canvasFrames';
import { randomToken } from '../session';
import { linkQuery } from '../useLinkRects';
import { Icon } from './Icon';
import '../styles/prototype.css';

const NO_BRIDGE_MS = 1500;
const LAYERS_FRESH_MS = 1500;

type Phase = 'loading' | 'enter' | 'run' | 'shown' | 'closing';
type OverlayKind = 'modal' | 'drawer';

interface Motion {
  transition: LinkTransition;
  duration: number;
  easing: string;
}

interface Slot extends Motion {
  key: string;
  frame: CanvasFrame;
  src: string;
  token: string;
  phase: Phase;
  overlay?: OverlayKind;
}

interface Props {
  kind: ProjectKind;
  file: LinksFile;
  frames: CanvasFrame[];
  startId: string;
  sandbox?: string;
  urlOf: (frame: CanvasFrame) => Promise<string | null>;
  frameTitle: (frame: CanvasFrame) => string;
  onClose: () => void;
}

const INSTANT: Motion = { transition: 'instant', duration: LINK_DURATION_DEFAULT, easing: easingCss(undefined) };

function motionOf(link: PrototypeLink): Motion {
  return { transition: link.transition, duration: linkDuration(link), easing: easingCss(link.easing) };
}

function useStageSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

function scaleFor(slot: Slot, stage: { width: number; height: number }): number {
  const frame = slot.frame;
  if (slot.overlay === 'drawer') return Math.min(1, (stage.height - 56) / frame.height, (stage.width * 0.9) / frame.width);
  if (slot.overlay === 'modal') return Math.min(1, (stage.width - 120) / frame.width, (stage.height - 180) / frame.height);
  return Math.min(1, (stage.width - 48) / frame.width, (stage.height - 120) / frame.height);
}

function slotClass(slot: Slot, leaving: boolean): string {
  return ['play-slot', `t-${slot.transition}`, slot.overlay ? `overlay-${slot.overlay}` : '', slot.phase, leaving ? 'leaving' : ''].filter(Boolean).join(' ');
}

function slotStyle(motion: Motion): CSSProperties {
  return { '--play-ms': `${motion.duration}ms`, '--play-ease': motion.easing } as CSSProperties;
}

function baseOf(slots: Slot[]): Slot[] {
  return slots.filter((slot) => !slot.overlay);
}

function overlayOf(slots: Slot[]): Slot | undefined {
  return slots.find((slot) => slot.overlay);
}

function settled(prev: Slot[], token: string): Slot[] {
  const target = prev.find((item) => item.token === token);
  if (!target) return prev;
  if (target.overlay) return prev.map((item) => (item.token === token ? { ...item, phase: 'shown' } : item));
  const at = prev.indexOf(target);
  return prev.filter((item, index) => index >= at || item.overlay).map((item) => (item.token === token ? { ...item, phase: 'shown' } : item));
}

function withPhase(prev: Slot[], token: string, phase: Phase): Slot[] {
  return prev.map((item) => (item.token === token ? { ...item, phase } : item));
}

function placed(prev: Slot[], slot: Slot): Slot[] {
  if (slot.overlay) return [...baseOf(prev), slot];
  return [...baseOf(prev).filter((item) => item.phase === 'shown' || item.phase === 'run').slice(-1), slot];
}

function keyOf(event: KeyboardEvent): 'exit' | 'restart' | 'back' | null {
  if (event.key === 'Escape') return 'exit';
  if (event.key === 'r' || event.key === 'R') return 'restart';
  return event.key === 'Backspace' || event.key === 'ArrowLeft' ? 'back' : null;
}

interface LayerShot {
  token: string;
  at: number;
  layers: Record<string, LinkRect>;
}

function usePlay(p: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const historyRef = useRef(history);
  historyRef.current = history;
  const timers = useRef<number[]>([]);
  const shot = useRef<LayerShot | null>(null);
  const pendingFx = useRef(new Map<string, Record<string, LinkRect>>());
  const readyFrames = useRef(new Map<string, BridgeFrame>());
  const props = useRef(p);
  props.current = p;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const freshLayers = (): Record<string, LinkRect> | null => {
    const top = slotsRef.current.at(-1);
    const last = shot.current;
    shot.current = null;
    if (!last || !top || last.token !== top.token || Date.now() - last.at > LAYERS_FRESH_MS || Object.keys(last.layers).length === 0) return null;
    return last.layers;
  };

  const settle = (token: string) => setSlots((prev) => settled(prev, token));

  const reveal = (token: string) => {
    const slot = slotsRef.current.find((item) => item.token === token);
    if (!slot || slot.phase !== 'loading') return;
    if (slot.transition === 'instant' || slot.transition === 'smart-animate') return settle(token);
    setSlots((prev) => withPhase(prev, token, 'enter'));
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        setSlots((prev) => withPhase(prev, token, 'run'));
        later(() => settle(token), slot.duration + 40);
      }),
    );
  };

  const place = (frameId: string, motion: Motion, overlay: OverlayKind | undefined, after: () => void) => {
    const frame = props.current.frames.find((item) => item.id === frameId);
    if (!frame) return setError('That frame is gone.');
    setError(null);
    const layers = motion.transition === 'smart-animate' ? freshLayers() : null;
    const effective: Motion = motion.transition === 'smart-animate' && !layers ? { ...motion, transition: 'dissolve' } : motion;
    void props.current.urlOf(frame).then((url) => {
      if (!url) return setError('The preview for that frame is not ready.');
      const token = randomToken();
      if (layers) pendingFx.current.set(token, layers);
      const first = slotsRef.current.length === 0;
      const slot: Slot = { key: token, frame, src: frameSrc(url, token, { [BRIDGE_PASSIVE_PARAM]: '1' }), token, ...(first ? INSTANT : effective), phase: 'loading', ...(overlay ? { overlay } : {}) };
      after();
      setSlots((prev) => placed(prev, slot));
      later(() => reveal(token), NO_BRIDGE_MS);
    });
  };

  const show = useCallback((frameId: string, motion: Motion, nextHistory: string[]) => place(frameId, motion, undefined, () => setHistory(nextHistory)), []);

  const closeOverlay = () => {
    const open = overlayOf(slotsRef.current);
    if (!open) return false;
    if (open.transition === 'instant') setSlots((prev) => prev.filter((item) => !item.overlay));
    else {
      setSlots((prev) => withPhase(prev, open.token, 'closing'));
      later(() => setSlots((prev) => prev.filter((item) => item.token !== open.token)), open.duration + 40);
    }
    return true;
  };

  const restart = useCallback(() => show(props.current.startId, { ...INSTANT, transition: 'dissolve' }, [props.current.startId]), [show]);

  const back = () => {
    if (closeOverlay()) return;
    const list = historyRef.current;
    if (list.length < 2) return;
    const previous = list[list.length - 2] as string;
    const current = baseOf(slotsRef.current).at(-1);
    const motion = current ? { transition: reverseTransition(current.transition), duration: current.duration, easing: current.easing } : INSTANT;
    show(previous, motion, list.slice(0, -1));
  };

  const onLinkClick = (id: string) => {
    const link = props.current.file.links.find((item) => item.id === id);
    if (!link) return;
    if (isBackTarget(link.to)) return back();
    if (link.action) return place(link.to.frame, motionOf(link), link.action, () => undefined);
    show(link.to.frame, motionOf(link), [...historyRef.current, link.to.frame]);
  };

  const onKey = (key: 'exit' | 'restart' | 'back') => {
    if (key === 'exit') {
      if (!closeOverlay()) props.current.onClose();
    } else if (key === 'restart') restart();
    else back();
  };

  useEffect(() => {
    restart();
    const list = timers.current;
    return () => list.forEach((timer) => window.clearTimeout(timer));
  }, [restart]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = keyOf(event);
      if (!key) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onKey(key);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  });

  const linkKey = p.file.links.map((link) => `${link.id}:${link.from.frame}:${link.from.selector}`).join('|');
  const sendLinks = (frame: BridgeFrame, slot: Slot) => {
    const links = props.current.file.links.filter((link) => link.from.frame === slot.frame.id && staticLinkIssue(link, props.current.frames) === null).map(linkQuery);
    postToFrame(frame, { type: 'play-links', links });
  };

  useEffect(() => {
    for (const token of readyFrames.current.keys()) if (!slotsRef.current.some((slot) => slot.token === token)) readyFrames.current.delete(token);
    for (const slot of slotsRef.current) {
      const frame = readyFrames.current.get(slot.token);
      if (frame) sendLinks(frame, slot);
    }
  }, [linkKey]);

  const onReady = (frame: BridgeFrame, slot: Slot) => {
    readyFrames.current.set(slot.token, frame);
    sendLinks(frame, slot);
    const layers = pendingFx.current.get(slot.token);
    if (layers) {
      pendingFx.current.delete(slot.token);
      postToFrame(frame, { type: 'play-fx', layers, duration: slot.duration, easing: slot.easing });
    }
    reveal(slot.token);
  };

  const bridgeFrames = (): BridgeFrame[] => slotsRef.current.map((slot) => ({ key: slot.token, token: slot.token, url: slot.src, kind: props.current.kind, element: elements.current[slot.token] ?? null }));
  useBridge(bridgeFrames, (frame, message: BridgeToParent) => {
    const slot = slotsRef.current.find((item) => item.token === frame.token);
    if (!slot) return;
    const top = slot === slotsRef.current.at(-1);
    if (message.type === 'ready') onReady(frame, slot);
    else if (message.type === 'play-layers' && top) shot.current = { token: slot.token, at: Date.now(), layers: message.layers };
    else if (message.type === 'play-click' && top) onLinkClick(message.id);
    else if (message.type === 'play-key') onKey(message.key);
  });

  return { slots, history, error, elements, restart, back, closeOverlay };
}

function SlotView({ slot, leaving, timing, stage, sandbox, bind }: { slot: Slot; leaving: boolean; timing: Motion; stage: { width: number; height: number }; sandbox?: string; bind: (el: HTMLIFrameElement | null) => void }) {
  const scale = scaleFor(slot, stage);
  return (
    <div className={slotClass(leaving ? { ...slot, transition: timing.transition } : slot, leaving)} style={slotStyle(timing)} data-frame-id={slot.frame.id} data-testid={slot.overlay ? 'play-overlay' : undefined}>
      <div className="play-frame" style={{ width: slot.frame.width * scale, height: slot.frame.height * scale }}>
        <iframe ref={bind} title="Prototype frame" src={slot.src} sandbox={sandbox} width={slot.frame.width} height={slot.frame.height} style={{ transform: `scale(${scale})` }} />
      </div>
    </div>
  );
}

export default function PlayMode(p: Props) {
  const play = usePlay(p);
  const stage = useStageSize();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current?.focus(), []);
  const base = baseOf(play.slots);
  const overlay = overlayOf(play.slots);
  const current = base.at(-1);
  const shownFrame = (overlay && overlay.phase !== 'closing' ? overlay.frame : undefined) ?? base.filter((slot) => slot.phase === 'shown' || slot.phase === 'run').at(-1)?.frame ?? current?.frame;
  const bind = (token: string) => (el: HTMLIFrameElement | null) => {
    play.elements.current[token] = el;
  };
  return (
    <div ref={root} className="present-layer play-layer" role="dialog" aria-modal="true" aria-label="Play prototype" tabIndex={-1} data-testid="play-layer">
      <div className="play-bar">
        <button type="button" className="icon-btn small" aria-label="Back" data-tip="Back  ⌫" disabled={play.history.length < 2 && !overlay} onClick={play.back}>
          <Icon name="arrowLeft" size={14} />
        </button>
        <span className="play-title" data-testid="play-title">
          {shownFrame ? p.frameTitle(shownFrame) : 'Loading…'}
        </span>
        <span className="play-hint">{p.file.links.length === 0 ? 'No links yet. Use the Prototype tool to link frames.' : overlay ? 'Click outside or press Esc to close' : 'Click a linked element'}</span>
        <button type="button" className="btn small ghost" onClick={play.restart}>
          <Icon name="restore" size={12} />
          Restart <kbd>R</kbd>
        </button>
        <button type="button" className="btn small ghost" onClick={p.onClose}>
          <Icon name="close" size={12} />
          Exit <kbd>Esc</kbd>
        </button>
      </div>
      {play.error && (
        <div className="play-error" role="status">
          {play.error}
        </div>
      )}
      <div className="play-stage">
        {base.map((slot) => {
          const leaving = slot !== current && current !== undefined && current.phase === 'run';
          return <SlotView key={slot.key} slot={slot} leaving={leaving} timing={leaving && current ? current : slot} stage={stage} sandbox={p.sandbox} bind={bind(slot.token)} />;
        })}
        {overlay && (
          <div className={`play-overlay ${overlay.phase}`} style={slotStyle(overlay)}>
            <button type="button" className="play-backdrop" aria-label="Close overlay" data-testid="play-backdrop" onClick={() => play.closeOverlay()} />
            <SlotView slot={overlay} leaving={false} timing={overlay} stage={stage} sandbox={p.sandbox} bind={bind(overlay.token)} />
          </div>
        )}
      </div>
    </div>
  );
}
