import type { CommentDrawing, DrawStroke } from "@design-studio/contracts";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactElement } from "react";

import { strokesBox } from "../../../shared/comments.js";
import { CommentComposer } from "../comments/comment-composer.js";
import type { ComposerSubmit } from "../comments/comment-composer.js";
import type { CommentTools } from "../comments/comment-layer.js";
import type { CommentsControl } from "../comments/use-comments.js";
import { useProfileInitial } from "../home/use-profile-initial.js";
import { copy } from "./copy.js";
import {
  DRAW_SCREEN_WIDTH,
  createStrokeBuilder,
  minStepFor,
  paintStrokes,
  renderDrawingPng,
} from "./drawing-model.js";
import type { StrokeBuilder } from "./drawing-model.js";
import { DrawingStrokes } from "./drawing-strokes.js";
import { PenIcon } from "./pen-icon.js";

import "../../styles/drawing.css";
import { toValueOr } from "./settle-model.js";
import type { DrawTool } from "./use-draw-tool.js";

interface Frame {
  width: number;
  height: number;
}

const MAX_BACKING_SIDE = 8192;
const MAX_BACKING_AREA = 24_000_000;

const backingScale = (frame: Frame, zoom: number): number => {
  const dpr =
    typeof globalThis === "undefined" ? 1 : globalThis.devicePixelRatio || 1;

  return Math.min(
    dpr * zoom,
    MAX_BACKING_SIDE / Math.max(frame.width, frame.height),
    Math.sqrt(MAX_BACKING_AREA / (frame.width * frame.height))
  );
};

interface SurfaceProps {
  draw: DrawTool;
  control: CommentsControl;
  zoom: number;
  frame: Frame;
  tools: CommentTools;
}

const DrawSurface = ({
  draw,
  control,
  zoom,
  frame,
  tools,
}: SurfaceProps): ReactElement => {
  const initial = useProfileInitial();
  const canvas = useRef<HTMLCanvasElement>(null);

  const active = useRef<{
    builder: StrokeBuilder;
    stroke: DrawStroke;
    pointer: number;
  } | null>(null);

  const [drawing, setDrawing] = useState(false);
  const scale = backingScale(frame, zoom);

  const paint = (): void => {
    const ctx = canvas.current?.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    paintStrokes(
      ctx,
      active.current ? [...draw.strokes, active.current.stroke] : draw.strokes,
      false
    );
  };

  useEffect(paint, [draw.strokes, scale, frame.width, frame.height]);

  const pointOf = (event: {
    clientX: number;
    clientY: number;
  }): { x: number; y: number } | null => {
    const rect = canvas.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: ((event.clientX - rect.left) * frame.width) / rect.width,
      y: ((event.clientY - rect.top) * frame.height) / rect.height,
    };
  };

  const onDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0 || active.current || draw.pointsLeft < 2) {
      return;
    }

    const point = pointOf(event);

    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const builder = createStrokeBuilder(point.x, point.y, minStepFor(zoom));
    active.current = {
      builder,
      pointer: event.pointerId,
      stroke: {
        color: draw.color,
        points: builder.points(),
        width: Math.round((DRAW_SCREEN_WIDTH / zoom) * 10) / 10,
      },
    };
    setDrawing(true);
    paint();
  };

  const onMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    const { current } = active;

    if (!current || current.pointer !== event.pointerId) {
      return;
    }

    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
    let changed = false;

    for (const sample of samples.length > 0 ? samples : [event.nativeEvent]) {
      if (current.builder.points().length >= draw.pointsLeft) {
        break;
      }

      const point = pointOf(sample);

      if (point) {
        changed = current.builder.add(point.x, point.y) || changed;
      }
    }

    if (changed) {
      paint();
    }
  };

  const onUp = (event: PointerEvent<HTMLCanvasElement>): void => {
    const { current } = active;

    if (!current || current.pointer !== event.pointerId) {
      return;
    }

    active.current = null;
    setDrawing(false);
    const point = pointOf(event);

    if (point && current.builder.points().length < draw.pointsLeft) {
      current.builder.end(point.x, point.y);
    }

    draw.push({ ...current.stroke, points: [...current.builder.points()] });
  };

  const box = strokesBox(draw.strokes);

  const submit = async ({
    text,
    toClaude,
    mentions,
    attachmentIds,
  }: ComposerSubmit): Promise<boolean> => {
    if (!box) {
      return false;
    }

    const { strokes } = draw;

    const value: CommentDrawing = {
      box,
      frame: {
        height: Math.round(frame.height),
        width: Math.round(frame.width),
      },
      strokes,
    };

    const image = await toValueOr(renderDrawingPng(value), null);

    if (!image) {
      return false;
    }

    const ok = await control.addDrawing({
      drawing: value,
      extras: { attachmentIds, mentions },
      image,
      text,
      toClaude,
    });

    if (ok) {
      draw.setOn(false);
    }

    return ok;
  };

  return (
    <>
      <canvas
        ref={canvas}
        className="draw-canvas"
        data-testid="draw-canvas"
        aria-label={copy.drawingArea}
        width={Math.max(1, Math.round(frame.width * scale))}
        height={Math.max(1, Math.round(frame.height * scale))}
        style={{ height: frame.height, width: frame.width }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      {box && !drawing && (
        <CommentComposer
          key="draw"
          label="Comment on drawing"
          testId="draw-compose"
          anchor={box}
          zoom={zoom}
          frame={frame}
          breadcrumb={{
            full: `${tools.pageName} › Drawing`,
            short: `${tools.pageName} › Drawing`,
          }}
          initial={initial}
          draftKey="draw"
          autoFocus
          trap
          running={control.running}
          busy={control.sending}
          sources={tools.sources}
          images
          steer={false}
          onSubmit={submit}
          onCancel={() => draw.setOn(false)}
        />
      )}
    </>
  );
};

export { DrawSurface, DrawingStrokes, PenIcon };
