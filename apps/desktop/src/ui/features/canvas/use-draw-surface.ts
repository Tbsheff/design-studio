import type { DrawStroke } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject, PointerEvent, RefObject } from "react";

import { backingScale } from "./draw-frame-model.js";
import type { DrawFrame } from "./draw-frame-model.js";
import {
  DRAW_SCREEN_WIDTH,
  createStrokeBuilder,
  minStepFor,
  paintStrokes,
} from "./drawing-model.js";
import type { StrokeBuilder } from "./drawing-model.js";
import type { DrawTool } from "./use-draw-tool.js";

interface ActiveStroke {
  builder: StrokeBuilder;
  stroke: DrawStroke;
  pointer: number;
}

interface DrawPoint {
  readonly x: number;
  readonly y: number;
}

type ToPoint = (event: {
  clientX: number;
  clientY: number;
}) => DrawPoint | null;

interface DrawPaint {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly paint: () => void;
  readonly pointOf: ToPoint;
  readonly scale: number;
}

interface DrawSurfaceState {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly isDrawing: boolean;
  readonly onDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onUp: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly scale: number;
}

const WIDTH_ROUND = 10;

const toSamples = (
  event: PointerEvent<HTMLCanvasElement>
): PointerEvent["nativeEvent"][] => {
  const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];

  if (samples.length > 0) {
    return samples;
  }

  return [event.nativeEvent];
};

const toStroke = (
  event: PointerEvent<HTMLCanvasElement>,
  point: DrawPoint,
  zoom: number,
  color: string
): ActiveStroke => {
  const builder = createStrokeBuilder(point.x, point.y, minStepFor(zoom));
  const strokeWidth = (DRAW_SCREEN_WIDTH / zoom) * WIDTH_ROUND;

  return {
    builder,
    pointer: event.pointerId,
    stroke: {
      color,
      points: builder.points(),
      width: Math.round(strokeWidth) / WIDTH_ROUND,
    },
  };
};

const addSamples = (
  current: ActiveStroke,
  event: PointerEvent<HTMLCanvasElement>,
  pointsLeft: number,
  pointOf: ToPoint
): boolean => {
  let changed = false;

  for (const sample of toSamples(event)) {
    if (current.builder.points().length >= pointsLeft) {
      break;
    }

    const point = pointOf(sample);

    if (point) {
      changed = current.builder.add(point.x, point.y) || changed;
    }
  }

  return changed;
};

const useDrawPaint = (
  draw: DrawTool,
  zoom: number,
  frame: DrawFrame,
  active: MutableRefObject<ActiveStroke | null>
): DrawPaint => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = backingScale(frame, zoom);
  const { strokes } = draw;
  const { height, width } = frame;

  const paint = useCallback((): void => {
    const ctx = canvasRef.current?.getContext("2d");

    if (!ctx) {
      return;
    }

    let shown = strokes;

    if (active.current) {
      shown = [...strokes, active.current.stroke];
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    paintStrokes(ctx, shown, false);
  }, [strokes, scale, active]);

  useEffect(paint, [paint, width, height]);

  const pointOf = useCallback<ToPoint>(
    (event) => {
      const rect = canvasRef.current?.getBoundingClientRect();

      if (!rect || rect.width === 0 || rect.height === 0) {
        return null;
      }

      return {
        x: ((event.clientX - rect.left) * width) / rect.width,
        y: ((event.clientY - rect.top) * height) / rect.height,
      };
    },
    [width, height]
  );

  return { canvasRef, paint, pointOf, scale };
};

const useDrawSurface = (
  draw: DrawTool,
  zoom: number,
  frame: DrawFrame
): DrawSurfaceState => {
  const active = useRef<ActiveStroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { canvasRef, paint, pointOf, scale } = useDrawPaint(
    draw,
    zoom,
    frame,
    active
  );

  const { color, pointsLeft, push } = draw;

  const onDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>): void => {
      const point = pointOf(event);

      if (event.button !== 0 || active.current || pointsLeft < 2 || !point) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      active.current = toStroke(event, point, zoom, color);
      setIsDrawing(true);
      paint();
    },
    [pointsLeft, pointOf, zoom, color, paint]
  );

  const onMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>): void => {
      const { current } = active;

      if (!current || current.pointer !== event.pointerId) {
        return;
      }

      if (addSamples(current, event, pointsLeft, pointOf)) {
        paint();
      }
    },
    [pointsLeft, pointOf, paint]
  );

  const onUp = useCallback(
    (event: PointerEvent<HTMLCanvasElement>): void => {
      const { current } = active;

      if (!current || current.pointer !== event.pointerId) {
        return;
      }

      active.current = null;
      setIsDrawing(false);

      const point = pointOf(event);

      if (point && current.builder.points().length < pointsLeft) {
        current.builder.end(point.x, point.y);
      }

      push({ ...current.stroke, points: [...current.builder.points()] });
    },
    [pointOf, pointsLeft, push]
  );

  return { canvasRef, isDrawing, onDown, onMove, onUp, scale };
};

export { useDrawSurface };
