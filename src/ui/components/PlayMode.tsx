import { useCallback, useEffect, useRef, useState } from 'react';
import { BRIDGE_PASSIVE_PARAM, type BridgeToParent, type ProjectKind } from '../../shared/contracts';
import { isBackTarget, reverseTransition, staticLinkIssue, type LinksFile, type LinkTransition } from '../../shared/links';
import { frameSrc, postToFrame, useBridge, type BridgeFrame } from '../bridge';
import type { CanvasFrame } from '../canvasFrames';
import { randomToken } from '../session';
import { linkQuery } from '../useLinkRects';
import { Icon } from './Icon';
import '../styles/prototype.css';

const TRANSITION_MS = 320;
const NO_BRIDGE_MS = 1500;

type Phase = 'loading' | 'enter' | 'run' | 'shown';

interface Slot {
  key: string;
  frame: CanvasFrame;
  src: string;
  token: string;
  transition: LinkTransition;
  phase: Phase;
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

function useStageSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

function scaleFor(frame: CanvasFrame, stage: { width: number; height: number }): number {
  return Math.min(1, (stage.width - 48) / frame.width, (stage.height - 120) / frame.height);
}

function slotClass(slot: Slot, leaving: boolean): string {
  return ['play-slot', `t-${slot.transition}`, slot.phase, leaving ? 'leaving' : ''].filter(Boolean).join(' ');
}

export default function PlayMode(p: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const historyRef = useRef(history);
  historyRef.current = history;
  const timers = useRef<number[]>([]);
  const stage = useStageSize();
  const root = useRef<HTMLDivElement>(null);
  const props = useRef(p);
  props.current = p;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const show = useCallback((frameId: string, transition: LinkTransition, nextHistory: string[]) => {
    const frame = props.current.frames.find((item) => item.id === frameId);
    if (!frame) {
      setError('That frame is gone.');
      return;
    }
    setError(null);
    void props.current.urlOf(frame).then((url) => {
      if (!url) {
        setError('The preview for that frame is not ready.');
        return;
      }
      const token = randomToken();
      const slot: Slot = { key: token, frame, src: frameSrc(url, token, { [BRIDGE_PASSIVE_PARAM]: '1' }), token, transition: slotsRef.current.length === 0 ? 'instant' : transition, phase: 'loading' };
      setHistory(nextHistory);
      setSlots((prev) => [...prev.filter((item) => item.phase === 'shown' || item.phase === 'run').slice(-1), slot]);
      later(() => reveal(token), NO_BRIDGE_MS);
    });
  }, []);

  const settle = (token: string) =>
    setSlots((prev) => {
      const at = prev.findIndex((item) => item.token === token);
      return at < 0 ? prev : prev.slice(at).map((item) => (item.token === token ? { ...item, phase: 'shown' } : item));
    });

  const reveal = (token: string) => {
    const slot = slotsRef.current.find((item) => item.token === token);
    if (!slot || slot.phase !== 'loading') return;
    if (slot.transition === 'instant') return settle(token);
    setSlots((prev) => prev.map((item) => (item.token === token ? { ...item, phase: 'enter' } : item)));
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        setSlots((prev) => prev.map((item) => (item.token === token ? { ...item, phase: 'run' } : item)));
        later(() => settle(token), TRANSITION_MS + 40);
      }),
    );
  };

  const restart = useCallback(() => show(props.current.startId, 'dissolve', [props.current.startId]), [show]);

  const back = useCallback(() => {
    const list = historyRef.current;
    if (list.length < 2) return;
    const previous = list[list.length - 2] as string;
    const current = slotsRef.current.at(-1);
    show(previous, reverseTransition(current?.transition ?? 'instant'), list.slice(0, -1));
  }, [show]);

  const onLinkClick = (id: string) => {
    const link = props.current.file.links.find((item) => item.id === id);
    if (!link) return;
    if (isBackTarget(link.to)) return back();
    show(link.to.frame, link.transition, [...historyRef.current, link.to.frame]);
  };

  const onKey = (key: 'exit' | 'restart' | 'back') => {
    if (key === 'exit') props.current.onClose();
    else if (key === 'restart') restart();
    else back();
  };

  useEffect(() => {
    restart();
    const list = timers.current;
    return () => list.forEach((timer) => window.clearTimeout(timer));
  }, [restart]);

  useEffect(() => {
    root.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key === 'Escape' ? 'exit' : event.key === 'r' || event.key === 'R' ? 'restart' : event.key === 'Backspace' || event.key === 'ArrowLeft' ? 'back' : null;
      if (!key) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onKey(key);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  });

  const bridgeFrames = (): BridgeFrame[] => slotsRef.current.map((slot) => ({ key: slot.token, token: slot.token, url: slot.src, kind: props.current.kind, element: elements.current[slot.token] ?? null }));
  useBridge(bridgeFrames, (frame, message: BridgeToParent) => {
    const slot = slotsRef.current.find((item) => item.token === frame.token);
    if (!slot) return;
    if (message.type === 'ready') {
      const links = props.current.file.links.filter((link) => link.from.frame === slot.frame.id && staticLinkIssue(link, props.current.frames) === null).map(linkQuery);
      postToFrame(frame, { type: 'play-links', links });
      reveal(slot.token);
    } else if (message.type === 'play-click' && slot === slotsRef.current.at(-1)) {
      onLinkClick(message.id);
    } else if (message.type === 'play-key') {
      onKey(message.key);
    }
  });

  const current = slots.at(-1);
  const shownFrame = slots.filter((slot) => slot.phase === 'shown' || slot.phase === 'run').at(-1)?.frame ?? current?.frame;
  return (
    <div ref={root} className="present-layer play-layer" role="dialog" aria-modal="true" aria-label="Play prototype" tabIndex={-1} data-testid="play-layer">
      <div className="play-bar">
        <button type="button" className="icon-btn small" aria-label="Back" data-tip="Back  ⌫" disabled={history.length < 2} onClick={back}>
          <Icon name="arrowLeft" size={14} />
        </button>
        <span className="play-title" data-testid="play-title">
          {shownFrame ? p.frameTitle(shownFrame) : 'Loading…'}
        </span>
        <span className="play-hint">{p.file.links.length === 0 ? 'No links yet. Use the Prototype tool to link frames.' : 'Click a linked element'}</span>
        <button type="button" className="btn small ghost" onClick={restart}>
          <Icon name="restore" size={12} />
          Restart <kbd>R</kbd>
        </button>
        <button type="button" className="btn small ghost" onClick={p.onClose}>
          <Icon name="close" size={12} />
          Exit <kbd>Esc</kbd>
        </button>
      </div>
      {error && (
        <div className="play-error" role="status">
          {error}
        </div>
      )}
      <div className="play-stage">
        {slots.map((slot) => {
          const scale = scaleFor(slot.frame, stage);
          const leaving = slot !== current && current !== undefined && current.phase === 'run';
          return (
            <div key={slot.key} className={slotClass(leaving ? { ...slot, transition: current.transition } : slot, leaving)} data-frame-id={slot.frame.id}>
              <div className="play-frame" style={{ width: slot.frame.width * scale, height: slot.frame.height * scale }}>
                <iframe
                  ref={(el) => {
                    elements.current[slot.token] = el;
                  }}
                  title="Prototype frame"
                  src={slot.src}
                  sandbox={p.sandbox}
                  width={slot.frame.width}
                  height={slot.frame.height}
                  style={{ transform: `scale(${scale})` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
