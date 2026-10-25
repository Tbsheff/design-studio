import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { CommentDrawing, DrawStroke } from '../../shared/contracts';
import { strokesBox } from '../../shared/comments';
import { DRAW_COLORS, DRAW_SCREEN_WIDTH, createStrokeBuilder, minStepFor, paintStrokes, renderDrawingPng, strokePath, type StrokeBuilder } from '../drawing';
import type { CommentsControl } from '../useComments';
import type { DrawTool } from '../useDrawTool';
import { ComposePopover, MOD_LABEL, popoverStyle } from './CommentPopover';
import { Icon } from './Icon';
import '../styles/drawing.css';

type Frame = { width: number; height: number };

const MAX_BACKING_SIDE = 8192;
const MAX_BACKING_AREA = 24_000_000;

export function PenIcon({ size = 16 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12.5c1.6-2.6 3-3.4 4-2.6 1.1.9-.6 2.8.6 3.3 1.1.5 2.6-1.2 3.6-2.2" />
      <path d="m9.6 7.4 3.6-3.6a1.13 1.13 0 0 0-1.6-1.6L8 5.8l-.5 2.1 2.1-.5Z" />
    </svg>
  );
}

function backingScale(frame: Frame, zoom: number): number {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.min(dpr * zoom, MAX_BACKING_SIDE / Math.max(frame.width, frame.height), Math.sqrt(MAX_BACKING_AREA / (frame.width * frame.height)));
}

interface SurfaceProps {
  draw: DrawTool;
  control: CommentsControl;
  zoom: number;
  frame: Frame;
}

export function DrawSurface({ draw, control, zoom, frame }: SurfaceProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<{ builder: StrokeBuilder; stroke: DrawStroke; pointer: number } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const scale = backingScale(frame, zoom);

  const paint = () => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    paintStrokes(ctx, active.current ? [...draw.strokes, active.current.stroke] : draw.strokes, false);
  };

  useEffect(paint, [draw.strokes, scale, frame.width, frame.height]);

  const pointOf = (event: { clientX: number; clientY: number }) => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return { x: ((event.clientX - rect.left) * frame.width) / rect.width, y: ((event.clientY - rect.top) * frame.height) / rect.height };
  };

  const onDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || active.current || draw.pointsLeft < 2) return;
    const point = pointOf(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const builder = createStrokeBuilder(point.x, point.y, minStepFor(zoom));
    active.current = { builder, pointer: event.pointerId, stroke: { color: draw.color, width: Math.round((DRAW_SCREEN_WIDTH / zoom) * 10) / 10, points: builder.points() } };
    setDrawing(true);
    paint();
  };

  const onMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = active.current;
    if (!current || current.pointer !== event.pointerId) return;
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
    let changed = false;
    for (const sample of samples.length ? samples : [event.nativeEvent]) {
      if (current.builder.points().length >= draw.pointsLeft) break;
      const point = pointOf(sample);
      if (point) changed = current.builder.add(point.x, point.y) || changed;
    }
    if (changed) paint();
  };

  const onUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = active.current;
    if (!current || current.pointer !== event.pointerId) return;
    active.current = null;
    setDrawing(false);
    const point = pointOf(event);
    if (point && current.builder.points().length < draw.pointsLeft) current.builder.end(point.x, point.y);
    draw.push({ ...current.stroke, points: [...current.builder.points()] });
  };

  const box = strokesBox(draw.strokes);

  const submit = async (text: string, sendNow: boolean): Promise<boolean> => {
    if (!box) return false;
    const strokes = draw.strokes;
    const value: CommentDrawing = { frame: { width: Math.round(frame.width), height: Math.round(frame.height) }, box, strokes };
    const image = await renderDrawingPng(value).catch(() => null);
    if (!image) return false;
    const ok = await control.addDrawing({ text, drawing: value, image, sendNow });
    if (ok) draw.setOn(false);
    return ok;
  };

  return (
    <>
      <canvas
        ref={canvas}
        className="draw-canvas"
        data-testid="draw-canvas"
        aria-label="Drawing area"
        width={Math.max(1, Math.round(frame.width * scale))}
        height={Math.max(1, Math.round(frame.height * scale))}
        style={{ width: frame.width, height: frame.height }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      {box && !drawing && (
        <ComposePopover
          key="draw"
          label="Comment on drawing"
          hint="Say what to change here"
          testId="draw-compose"
          style={popoverStyle(box, zoom, frame)}
          autoFocus
          trap
          busy={control.sending}
          onQueue={(text) => submit(text, false)}
          onSendNow={(text) => submit(text, true)}
          onCancel={() => draw.setOn(false)}
        />
      )}
    </>
  );
}

function onSwatchKey(event: KeyboardEvent<HTMLDivElement>) {
  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
  if (step === 0) return;
  const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const index = radios.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = radios[(index + step + radios.length) % radios.length];
  next?.focus();
  next?.click();
}

export function DrawBar({ draw }: { draw: DrawTool }) {
  if (!draw.on) return null;
  const count = draw.strokes.length;
  return (
    <div className="draw-bar" role="toolbar" aria-label="Drawing" data-testid="draw-bar" onPointerDown={(event) => event.stopPropagation()}>
      <div className="draw-swatches" role="radiogroup" aria-label="Pen color" onKeyDown={onSwatchKey}>
        {DRAW_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            role="radio"
            className="draw-swatch"
            aria-label={color.label}
            aria-checked={draw.color === color.value}
            tabIndex={draw.color === color.value ? 0 : -1}
            style={{ color: color.value }}
            onClick={() => draw.setColor(color.value)}
          />
        ))}
      </div>
      <div className="toolbar-sep" />
      <button type="button" className="icon-btn small" aria-label="Undo stroke" aria-keyshortcuts="Meta+Z Control+Z" data-tip={`Undo stroke  ${MOD_LABEL}Z`} disabled={count === 0} onClick={draw.undo}>
        <Icon name="undo" />
      </button>
      <button type="button" className="icon-btn small" aria-label="Clear drawing" data-tip="Clear" disabled={count === 0} onClick={draw.clear}>
        <Icon name="trash" />
      </button>
      <span className="draw-hint">{count === 0 ? 'Draw on the design' : `${count} ${count === 1 ? 'stroke' : 'strokes'}`}</span>
      <button type="button" className="btn small ghost" aria-keyshortcuts="Escape" onClick={() => draw.setOn(false)}>
        Done <kbd>Esc</kbd>
      </button>
    </div>
  );
}

export function DrawingStrokes({ drawing }: { drawing: CommentDrawing }) {
  const { width, height } = drawing.frame;
  return (
    <svg className="drawing-strokes" data-testid="comment-drawing" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {drawing.strokes.map((stroke, index) => {
        const d = strokePath(stroke.points);
        return (
          <g key={index}>
            <path d={d} style={{ stroke: 'var(--halo)' }} strokeWidth={stroke.width + 3} />
            <path d={d} stroke={stroke.color} strokeWidth={stroke.width} />
          </g>
        );
      })}
    </svg>
  );
}
