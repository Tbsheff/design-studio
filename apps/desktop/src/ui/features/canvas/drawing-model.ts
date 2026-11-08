import type { CommentDrawing, DrawStroke } from "@design-studio/contracts";

const VALUE_10 = 10;

const ROUND_10 = 10;

const LENGTH_4 = 4;

const MAX_0_05 = 0.05;

const INDEX_3 = 3;

const X0_0_01 = 0.01;

const INDEX_VALUE_3 = 3;

const WIDTH_3 = 3;

const DRAW_COLORS = [
  { id: "red", label: "Red", value: "#ff3b30" },
  { id: "blue", label: "Blue", value: "#0a84ff" },
  { id: "green", label: "Green", value: "#1fae4c" },
  { id: "ink", label: "Black", value: "#1c1c1e" },
] as const;

const DRAW_SCREEN_WIDTH = 3;

const SMOOTHING = 0.45;

const MIN_STEP_SCREEN = 1.5;

const PNG_MAX_SIDE = 4096;

const HALO = "rgba(255, 255, 255, 0.9)";

interface StrokeBuilder {
  add(pointX: number, pointY: number): boolean;
  end(pointXValue: number, pointYValue: number): void;
  points(): number[];
}

const round = (value: number): number =>
  Math.round(value * VALUE_10) / ROUND_10;

const createStrokeBuilder = (
  pointX3: number,
  pointY3: number,
  minStep: number
): StrokeBuilder => {
  const points = [round(pointX3), round(pointY3)];
  let lastX = pointX3;
  let lastY = pointY3;

  return {
    add(rawX, rawY) {
      const nextX = lastX + (rawX - lastX) * (1 - SMOOTHING);
      const nextY = lastY + (rawY - lastY) * (1 - SMOOTHING);

      if (Math.hypot(nextX - lastX, nextY - lastY) < minStep) {
        return false;
      }

      lastX = nextX;
      lastY = nextY;
      points.push(round(nextX), round(nextY));

      return true;
    },
    end(rawX, rawY) {
      if (
        points.length >= LENGTH_4 &&
        Math.hypot(rawX - lastX, rawY - lastY) < minStep / 2
      ) {
        return;
      }

      lastX = rawX;
      lastY = rawY;
      points.push(round(rawX), round(rawY));
    },
    points: () => points,
  };
};

const minStepFor = (zoom: number): number =>
  MIN_STEP_SCREEN / Math.max(zoom, MAX_0_05);

const strokePath = (points: number[]): string => {
  const count = points.length / 2;

  if (count === 0) {
    return "";
  }

  const x0 = points[0] as number;
  const y0 = points[1] as number;

  if (count === 1) {
    return `M${x0} ${y0}l0.01 0`;
  }

  let path = `M${x0} ${y0}`;

  for (let index = 1; index < count - 1; index += 1) {
    const pointX4 = points[index * 2] as number;
    const pointY4 = points[index * 2 + 1] as number;
    const mx = (pointX4 + (points[index * 2 + 2] as number)) / 2;
    const my = (pointY4 + (points[index * 2 + INDEX_3] as number)) / 2;
    path += `Q${pointX4} ${pointY4} ${round(mx)} ${round(my)}`;
  }

  return `${path}L${points[(count - 1) * 2]} ${points[(count - 1) * 2 + 1]}`;
};

const traceStroke = (ctx: CanvasRenderingContext2D, points: number[]): void => {
  const count = points.length / 2;
  const x0 = points[0] as number;
  const y0 = points[1] as number;
  ctx.beginPath();
  ctx.moveTo(x0, y0);

  if (count === 1) {
    ctx.lineTo(x0 + X0_0_01, y0);
  }

  for (let indexValue = 1; indexValue < count - 1; indexValue += 1) {
    const pointX5 = points[indexValue * 2] as number;
    const pointY5 = points[indexValue * 2 + 1] as number;
    ctx.quadraticCurveTo(
      pointX5,
      pointY5,
      (pointX5 + (points[indexValue * 2 + 2] as number)) / 2,
      (pointY5 + (points[indexValue * 2 + INDEX_VALUE_3] as number)) / 2
    );
  }

  if (count > 1) {
    ctx.lineTo(
      points[(count - 1) * 2] as number,
      points[(count - 1) * 2 + 1] as number
    );
  }
};

const paintStrokes = (
  ctx: CanvasRenderingContext2D,
  strokes: DrawStroke[],
  halo: boolean
): void => {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.points.length < 2) {
      continue;
    }

    traceStroke(ctx, stroke.points);

    if (halo) {
      ctx.strokeStyle = HALO;
      ctx.lineWidth = stroke.width + WIDTH_3;
      ctx.stroke();
    }

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.stroke();
  }
};

const renderDrawingPng = (drawing: CommentDrawing): Promise<Blob> => {
  const { width, height } = drawing.frame;
  const scale = Math.min(1, PNG_MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return Promise.reject(new Error("Canvas is not available"));
  }

  ctx.scale(scale, scale);
  paintStrokes(ctx, drawing.strokes, true);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (blob) {
        return resolve(blob);
      }

      return reject(new Error("Could not make the drawing image"));
    }, "image/png")
  );
};

interface PenAnchor {
  x: number;
  y: number;
  hin?: { x: number; y: number };
  hout?: { x: number; y: number };
}

const penSegment = (from: PenAnchor, to: PenAnchor): string => {
  if (!from.hout && !to.hin) {
    return `L${round(to.x)} ${round(to.y)}`;
  }

  const firstValue = from.hout ?? from;
  const second = to.hin ?? to;

  return `C${round(firstValue.x)} ${round(firstValue.y)} ${round(second.x)} ${round(second.y)} ${round(to.x)} ${round(to.y)}`;
};

const shiftAnchor = (anchor: PenAnchor, dx: number, dy: number): PenAnchor => {
  const move = (point: { x: number; y: number }): { x: number; y: number } => ({
    x: point.x + dx,
    y: point.y + dy,
  });

  return {
    x: anchor.x + dx,
    y: anchor.y + dy,
    ...(anchor.hin ? { hin: move(anchor.hin) } : {}),
    ...(anchor.hout ? { hout: move(anchor.hout) } : {}),
  };
};

const penPath = (
  anchors: PenAnchor[],
  closed: boolean,
  dx = 0,
  dy = 0
): string => {
  let moved: PenAnchor[] = anchors;

  if (!(dx === 0 && dy === 0)) {
    moved = anchors.map((anchor) => shiftAnchor(anchor, dx, dy));
  }

  const first = moved[0];

  if (!first) {
    return "";
  }

  let delta = `M${round(first.x)} ${round(first.y)}`;

  for (let index3 = 1; index3 < moved.length; index3 += 1) {
    delta += penSegment(
      moved[index3 - 1] as PenAnchor,
      moved[index3] as PenAnchor
    );
  }

  if (closed && moved.length > 1) {
    delta += `${penSegment(moved.at(-1) as PenAnchor, first)}Z`;
  }

  return delta;
};

export {
  DRAW_COLORS,
  DRAW_SCREEN_WIDTH,
  createStrokeBuilder,
  minStepFor,
  paintStrokes,
  penPath,
  renderDrawingPng,
  strokePath,
};

export type { PenAnchor, StrokeBuilder };
