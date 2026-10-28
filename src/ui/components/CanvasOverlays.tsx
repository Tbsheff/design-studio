import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { BridgeToParent, SelectionContext } from '../../shared/contracts';
import { formatMeasure } from '../measure';
import type { SpacingBadge } from '../snap';
import { frameSnapStore } from '../useFrameResize';
import { guideStyle } from './ArtboardOverlay';
import { Icon } from './Icon';

export function PresentLayer({ url, sandbox, fullscreen, onClose }: { url: string; sandbox?: string; fullscreen: boolean; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (fullscreen && el?.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    const onFullscreen = () => {
      if (fullscreen && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('fullscreenchange', onFullscreen);
    root.current?.querySelector<HTMLButtonElement>('.present-close')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [fullscreen, onClose]);
  return (
    <div ref={root} className="present-layer" role="dialog" aria-modal="true" aria-label="Present">
      <iframe className="present-frame" title="Presented design" src={url} sandbox={sandbox} />
      <button type="button" className="btn small present-close" onClick={onClose}>
        <Icon name="close" size={12} />
        Exit
        <kbd>Esc</kbd>
      </button>
    </div>
  );
}

export function TweakPrompt({ scope, onSend, onClose }: { scope: string | null; onSend: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const root = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!root.current?.contains(target) && !target.closest?.('[aria-label="Tweak"]')) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);
  const send = () => {
    const prompt = text.trim();
    if (!prompt) return;
    onSend(prompt);
    setText('');
    onClose();
  };
  return (
    <form
      ref={root}
      className="tweak-prompt ui-popover"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <input
        autoFocus
        aria-label="Describe a tweak"
        placeholder={scope ? `Describe a tweak to ${scope}…` : 'Describe a tweak…'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      <button type="submit" className="icon-btn small send" aria-label="Send tweak" disabled={!text.trim()}>
        <Icon name="arrowUp" size={14} />
      </button>
    </form>
  );
}


function gapStyle(b: SpacingBadge) {
  return b.axis === 'x' ? { left: b.from, top: b.at, width: b.to - b.from } : { left: b.at, top: b.from, height: b.to - b.from };
}

export function FrameSnapLayer({ origin }: { origin: { x: number; y: number } }) {
  const view = useSyncExternalStore(frameSnapStore.subscribe, frameSnapStore.get);
  if (view.guides.length === 0 && view.spacing.length === 0) return null;
  const style = { left: -origin.x, top: -origin.y, translate: `${view.shift.x}px ${view.shift.y}px` };
  return (
    <div className="snap-guides frame-snap" data-testid="frame-snap" style={style}>
      {view.guides.map((g) => (
        <div key={`g-${g.axis}-${g.at}`} className={`snap-guide ${g.axis}`} style={guideStyle(g)} />
      ))}
      {view.spacing.map((b) => (
        <div key={`s-${b.axis}-${b.from}-${b.to}`} className={`snap-gap ${b.axis}`} style={gapStyle(b)}>
          <span className="snap-gap-label" data-value={b.value}>
            {formatMeasure(b.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MarqueeLayer({ listen }: { listen: (handler: (message: BridgeToParent) => void) => () => void }) {
  const [rect, setRect] = useState<SelectionContext['rect'] | null>(null);
  useEffect(
    () =>
      listen((message) => {
        if (message.type === 'marquee') setRect(message.rect);
        else if (message.type === 'ready' || message.type === 'mode-exited') setRect(null);
      }),
    [listen],
  );
  if (!rect) return null;
  return (
    <div className="overlay" aria-hidden="true">
      <div className="box marquee" data-testid="marquee" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />
    </div>
  );
}
