import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import type { ProjectKind, Version } from '../../shared/contracts';
import { versionDiff, type DiffMaskResult } from '../versionsApi';
import { CompareFrame } from './CompareFrame';

export interface BoardProps {
  projectId: string;
  kind: ProjectKind;
  older: Version;
  newer: Version;
  olderTitle: string;
  newerTitle: string;
  viewport: { width: number; height: number };
  scale: number;
  onError: (message: string) => void;
}

const KEY_STEP: Record<string, (pos: number, big: boolean) => number> = {
  ArrowLeft: (pos, big) => pos - (big ? 10 : 2),
  ArrowDown: (pos, big) => pos - (big ? 10 : 2),
  ArrowRight: (pos, big) => pos + (big ? 10 : 2),
  ArrowUp: (pos, big) => pos + (big ? 10 : 2),
  Home: () => 0,
  End: () => 100,
};

const clampPct = (value: number) => Math.min(100, Math.max(0, value));

function Label({ side, title, align }: { side: 'A' | 'B'; title: string; align: 'start' | 'end' }) {
  return (
    <div className={`compare-label ${align}`} data-tip={title}>
      <span className="badge accent">{side}</span>
      <span className="compare-title truncate">
        {title}
      </span>
    </div>
  );
}

function Stage({ labels, children }: { labels: ReactNode; children: ReactNode }) {
  return (
    <div className="compare-pane single">
      <div className="compare-labels">{labels}</div>
      <div className="compare-stage">{children}</div>
    </div>
  );
}

function useWipe() {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const fromPointer = (clientX: number) => {
    const rect = board.current?.getBoundingClientRect();
    if (rect && rect.width > 0) setPos(clampPct(((clientX - rect.left) / rect.width) * 100));
  };
  const boardProps = {
    ref: board,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      fromPointer(event.clientX);
      handle.current?.focus({ preventScroll: true });
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => dragging && fromPointer(event.clientX),
    onPointerUp: () => setDragging(false),
    onPointerCancel: () => setDragging(false),
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEP[event.key];
    if (!step) return;
    event.preventDefault();
    event.stopPropagation();
    setPos((current) => clampPct(step(current, event.shiftKey)));
  };
  return { pos, dragging, boardProps, handle, onKeyDown };
}

function WipeHandle({ handleRef, pos, width, onKeyDown, valueText }: { handleRef: RefObject<HTMLDivElement | null>; pos: number; width: number; onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void; valueText: string }) {
  const rounded = Math.round(pos);
  return (
    <div
      ref={handleRef}
      className="compare-handle"
      role="slider"
      tabIndex={0}
      aria-label="Compare position"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      aria-valuetext={valueText}
      aria-orientation="horizontal"
      data-tip="Drag, or use ← →"
      style={{ transform: `translateX(${(pos / 100) * width}px)` }}
      onKeyDown={onKeyDown}
    >
      <span className="compare-knob" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4 2 8l4 4M10 4l4 4-4 4" />
        </svg>
      </span>
    </div>
  );
}

export function SliderBoard(props: BoardProps) {
  const { viewport, scale } = props;
  const width = viewport.width * scale;
  const wipe = useWipe();
  const rounded = Math.round(wipe.pos);
  return (
    <Stage labels={<><Label side="A" title={props.olderTitle} align="start" /><Label side="B" title={props.newerTitle} align="end" /></>}>
      <div {...wipe.boardProps} className={`compare-board locked slider ${wipe.dragging ? 'dragging' : ''}`} data-testid="compare-slider" style={{ width, height: viewport.height * scale }}>
        <CompareFrame projectId={props.projectId} version={props.older} title={props.olderTitle} kind={props.kind} viewport={viewport} scale={scale} onError={props.onError} />
        <div className="compare-layer" data-testid="compare-slider-top" style={{ clipPath: `inset(0 0 0 ${wipe.pos}%)` }}>
          <CompareFrame projectId={props.projectId} version={props.newer} title={props.newerTitle} kind={props.kind} viewport={viewport} scale={scale} onError={props.onError} />
        </div>
        <WipeHandle handleRef={wipe.handle} pos={wipe.pos} width={width} onKeyDown={wipe.onKeyDown} valueText={`${rounded}% A, ${100 - rounded}% B`} />
      </div>
    </Stage>
  );
}

type MaskState = { status: 'loading' } | { status: 'ready'; mask: DiffMaskResult } | { status: 'error'; message: string };

function useDiffMask(projectId: string, older: string, newer: string, viewport: { width: number; height: number }, attempt: number): MaskState {
  const [state, setState] = useState<MaskState>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    let url: string | null = null;
    setState({ status: 'loading' });
    versionDiff(projectId, older, newer, viewport, controller.signal).then(
      (mask) => {
        url = mask.url;
        if (controller.signal.aborted) URL.revokeObjectURL(mask.url);
        else setState({ status: 'ready', mask });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [projectId, older, newer, viewport.width, viewport.height, attempt]);
  return state;
}

function OverlayStatus({ state, onRetry }: { state: MaskState; onRetry: () => void }) {
  if (state.status === 'loading') {
    return (
      <span className="compare-status" role="status">
        <span className="spinner" aria-hidden="true" />
        Finding changes…
      </span>
    );
  }
  if (state.status === 'error') {
    return (
      <span className="compare-status error" role="alert">
        {state.message}
        <button type="button" className="link" onClick={onRetry}>
          Retry
        </button>
      </span>
    );
  }
  const pct = state.mask.changedPct;
  return (
    <span className="compare-status" role="status" data-testid="compare-changed">
      {pct === 0 ? 'No visible changes' : `${pct < 0.1 ? '< 0.1' : pct}% of pixels changed`}
    </span>
  );
}

export function OverlayBoard(props: BoardProps) {
  const { viewport, scale } = props;
  const [attempt, setAttempt] = useState(0);
  const [show, setShow] = useState(true);
  const [opacity, setOpacity] = useState(70);
  const state = useDiffMask(props.projectId, props.older.id, props.newer.id, viewport, attempt);
  return (
    <Stage
      labels={
        <>
          <Label side="B" title={props.newerTitle} align="start" />
          <div className="compare-overlay-controls">
            <OverlayStatus state={state} onRetry={() => setAttempt((n) => n + 1)} />
            <label className="compare-toggle">
              <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} />
              Show changes
            </label>
            <input
              type="range"
              className="compare-opacity"
              aria-label="Change tint opacity"
              min={10}
              max={100}
              step={5}
              value={opacity}
              disabled={!show}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
            <span className="compare-opacity-value">{opacity}%</span>
          </div>
        </>
      }
    >
      <div className="compare-board locked" style={{ width: viewport.width * scale, height: viewport.height * scale }}>
        <CompareFrame projectId={props.projectId} version={props.newer} title={props.newerTitle} kind={props.kind} viewport={viewport} scale={scale} onError={props.onError} />
        {state.status === 'ready' && (
          <img
            className={`compare-mask ${show ? '' : 'off'}`}
            data-testid="compare-mask"
            src={state.mask.url}
            alt=""
            draggable={false}
            style={{ opacity: show ? opacity / 100 : 0 }}
          />
        )}
      </div>
    </Stage>
  );
}

interface Picture {
  url: string;
  name: string;
}

let lastPicture: Picture | null = null;

function usePicture() {
  const [picture, setPictureState] = useState<Picture | null>(lastPicture);
  const setPicture = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (lastPicture) URL.revokeObjectURL(lastPicture.url);
    lastPicture = { url: URL.createObjectURL(file), name: file.name };
    setPictureState(lastPicture);
  };
  return { picture, setPicture };
}

function PicturePicker({ onPick, compact }: { onPick: (file: File | undefined) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onPick(event.target.files?.[0]);
    event.target.value = '';
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    onPick(event.dataTransfer.files[0]);
  };
  const pick = (
    <>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={onChange} data-testid="compare-ref-input" />
      <button type="button" className="btn small" onClick={() => input.current?.click()}>
        {compact ? 'Change picture…' : 'Choose picture…'}
      </button>
    </>
  );
  if (compact) return pick;
  return (
    <div className={`compare-ref-empty ${over ? 'over' : ''}`} onDragOver={(event) => (event.preventDefault(), setOver(true))} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <span>Drop a screenshot or mock here to lay it over the newer version.</span>
      {pick}
    </div>
  );
}

export function ReferenceBoard(props: BoardProps) {
  const { viewport, scale } = props;
  const width = viewport.width * scale;
  const wipe = useWipe();
  const { picture, setPicture } = usePicture();
  const [opacity, setOpacity] = useState(100);
  const rounded = Math.round(wipe.pos);
  return (
    <Stage
      labels={
        <>
          <Label side="B" title={props.newerTitle} align="start" />
          <div className="compare-ref-controls">
            {picture && (
              <>
                <span className="truncate" data-tip={picture.name}>Reference: {picture.name}</span>
                <input type="range" className="compare-opacity" aria-label="Reference opacity" min={10} max={100} step={5} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
                <span className="compare-opacity-value">{opacity}%</span>
                <PicturePicker onPick={setPicture} compact />
              </>
            )}
          </div>
        </>
      }
    >
      {picture ? (
        <div {...wipe.boardProps} className={`compare-board locked slider ${wipe.dragging ? 'dragging' : ''}`} data-testid="compare-reference" style={{ width, height: viewport.height * scale }}>
          <CompareFrame projectId={props.projectId} version={props.newer} title={props.newerTitle} kind={props.kind} viewport={viewport} scale={scale} onError={props.onError} />
          <div className="compare-layer" style={{ clipPath: `inset(0 0 0 ${wipe.pos}%)`, opacity: opacity / 100 }}>
            <img className="compare-ref-picture" data-testid="compare-ref-picture" src={picture.url} alt={`Reference ${picture.name}`} draggable={false} />
          </div>
          <WipeHandle handleRef={wipe.handle} pos={wipe.pos} width={width} onKeyDown={wipe.onKeyDown} valueText={`${rounded}% frame, ${100 - rounded}% reference`} />
        </div>
      ) : (
        <PicturePicker onPick={setPicture} />
      )}
    </Stage>
  );
}
