import type { RefObject } from "react";

import type { Rect } from "./snap-model.js";

const RULER_SIZE = 20;
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000];
const MIN_LABEL_PX = 56;

interface View {
  x: number;
  y: number;
  zoom: number;
}

interface Props {
  artboardRef: RefObject<HTMLDivElement | null>;
  origin: { x: number; y: number };
  selection: Rect | null;
}

interface Colors {
  bg: string;
  tick: string;
  text: string;
  mark: string;
  markText: string;
  line: string;
}

const viewOf = (el: HTMLElement | null): View | null => {
  const match = el
    ? /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/.exec(
        el.style.transform
      )
    : null;

  if (!match) {
    return null;
  }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
    zoom: Number(match[3]) || 1,
  };
};

const stepFor = (zoom: number): number =>
  STEPS.find((textValue) => textValue * zoom >= MIN_LABEL_PX) ??
  (STEPS.at(-1) as number);

const colorsOf = (el: HTMLElement): Colors => {
  const css = getComputedStyle(el);

  const valueValue = (name: string): string =>
    css.getPropertyValue(name).trim();

  return {
    bg: valueValue("--ruler-bg"),
    line: valueValue("--ruler-line"),
    mark: valueValue("--ruler-mark"),
    markText: valueValue("--ruler-mark-text"),
    text: valueValue("--ruler-text"),
    tick: valueValue("--ruler-tick"),
  };
};

const sizeCanvas = (
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D | null => {
  const dpr = window.devicePixelRatio || 1;
  const widthValue = canvas.clientWidth;
  const heightValue = canvas.clientHeight;

  if (
    canvas.width !== Math.round(widthValue * dpr) ||
    canvas.height !== Math.round(heightValue * dpr)
  ) {
    canvas.width = Math.round(widthValue * dpr);
    canvas.height = Math.round(heightValue * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

  return ctx;
};

interface AxisDraw {
  ctx: CanvasRenderingContext2D;
  length: number;
  offset: number;
  zoom: number;
  origin: number;
  vertical: boolean;
  colors: Colors;
  range: [number, number] | null;
}

const toScreen = (axisDraw: AxisDraw, value: number): number =>
  axisDraw.offset + (value - axisDraw.origin) * axisDraw.zoom;

const tick = (axisDrawValue: AxisDraw, pos: number, len: number): void => {
  if (axisDrawValue.vertical) {
    axisDrawValue.ctx.moveTo(RULER_SIZE - len, pos + 0.5);
    axisDrawValue.ctx.lineTo(RULER_SIZE, pos + 0.5);
  } else {
    axisDrawValue.ctx.moveTo(pos + 0.5, RULER_SIZE - len);
    axisDrawValue.ctx.lineTo(pos + 0.5, RULER_SIZE);
  }
};

const markSpans = (axisDraw3: AxisDraw): [number, number][] => {
  if (!axisDraw3.range) {
    return [];
  }

  return axisDraw3.range.map((value) => {
    const pos = toScreen(axisDraw3, value);

    const half =
      (axisDraw3.ctx.measureText(String(Math.round(value))).width + 6) / 2 + 2;

    return [pos - half, pos + half];
  });
};

const label = (
  axisDraw4: AxisDraw,
  pos: number,
  text: string,
  marks: [number, number][]
): void => {
  const { ctx } = axisDraw4;
  const { width } = ctx.measureText(text);

  const [from, to] = axisDraw4.vertical
    ? [pos - 3 - width, pos - 3]
    : [pos + 3, pos + 3 + width];

  if (marks.some(([lo, hi]) => from < hi && to > lo)) {
    return;
  }

  if (!axisDraw4.vertical) {
    ctx.fillText(text, pos + 3, 9);

    return;
  }

  ctx.save();
  ctx.translate(9, pos - 3);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(text, 0, 0);
  ctx.restore();
};

const drawRange = (axisDraw5: AxisDraw): void => {
  if (!axisDraw5.range) {
    return;
  }

  const [lo, hi] = axisDraw5.range.map((value3) =>
    toScreen(axisDraw5, value3)
  ) as [number, number];

  axisDraw5.ctx.fillStyle = axisDraw5.colors.mark;
  axisDraw5.ctx.globalAlpha = 0.18;

  if (axisDraw5.vertical) {
    axisDraw5.ctx.fillRect(0, lo, RULER_SIZE, hi - lo);
  } else {
    axisDraw5.ctx.fillRect(lo, 0, hi - lo, RULER_SIZE);
  }

  axisDraw5.ctx.globalAlpha = 1;
  axisDraw5.ctx.fillRect(
    axisDraw5.vertical ? 0 : lo,
    axisDraw5.vertical ? lo : 0,
    axisDraw5.vertical ? RULER_SIZE : 1,
    axisDraw5.vertical ? 1 : RULER_SIZE
  );
  axisDraw5.ctx.fillRect(
    axisDraw5.vertical ? 0 : hi - 1,
    axisDraw5.vertical ? hi - 1 : 0,
    axisDraw5.vertical ? RULER_SIZE : 1,
    axisDraw5.vertical ? 1 : RULER_SIZE
  );
};

const drawRangeLabels = (axisDraw6: AxisDraw): void => {
  if (!axisDraw6.range) {
    return;
  }

  axisDraw6.ctx.fillStyle = axisDraw6.colors.mark;

  for (const value of axisDraw6.range) {
    const pos = toScreen(axisDraw6, value);
    const text = String(Math.round(value));
    const width3 = axisDraw6.ctx.measureText(text).width + 6;

    if (axisDraw6.vertical) {
      axisDraw6.ctx.fillRect(1, pos - width3 / 2, RULER_SIZE - 2, width3);
    } else {
      axisDraw6.ctx.fillRect(pos - width3 / 2, 1, width3, RULER_SIZE - 2);
    }

    axisDraw6.ctx.fillStyle = axisDraw6.colors.markText;
    axisDraw6.ctx.save();
    axisDraw6.ctx.textAlign = "center";
    axisDraw6.ctx.textBaseline = "middle";
    axisDraw6.ctx.translate(
      axisDraw6.vertical ? RULER_SIZE / 2 : pos,
      axisDraw6.vertical ? pos : RULER_SIZE / 2
    );

    if (axisDraw6.vertical) {
      axisDraw6.ctx.rotate(-Math.PI / 2);
    }

    axisDraw6.ctx.fillText(text, 0, 0);
    axisDraw6.ctx.restore();
    axisDraw6.ctx.fillStyle = axisDraw6.colors.mark;
  }
};

const drawAxis = (a: AxisDraw): void => {
  const { ctx } = a;
  ctx.fillStyle = a.colors.bg;
  ctx.fillRect(
    0,
    0,
    a.vertical ? RULER_SIZE : a.length,
    a.vertical ? a.length : RULER_SIZE
  );
  drawRange(a);
  const step = stepFor(a.zoom);
  const minor = step / 5;
  const first = Math.floor((a.origin + (0 - a.offset) / a.zoom) / step) * step;
  const last = a.origin + (a.length - a.offset) / a.zoom;
  ctx.strokeStyle = a.colors.tick;
  ctx.fillStyle = a.colors.text;
  ctx.lineWidth = 1;
  const marks = markSpans(a);
  ctx.beginPath();

  for (let value4 = first; value4 <= last; value4 += step) {
    const pos = Math.round(toScreen(a, value4));
    tick(a, pos, RULER_SIZE);
    label(a, pos, String(Math.round(value4)), marks);

    for (let index = 1; index < 5; index += 1) {
      tick(a, Math.round(toScreen(a, value4 + minor * index)), 4);
    }
  }

  ctx.stroke();
  ctx.fillStyle = a.colors.line;

  if (a.vertical) {
    ctx.fillRect(RULER_SIZE - 1, 0, 1, a.length);
  } else {
    ctx.fillRect(0, RULER_SIZE - 1, a.length, 1);
  }

  drawRangeLabels(a);
};

export { RULER_SIZE, colorsOf, drawAxis, sizeCanvas, viewOf };

export type { Props };
