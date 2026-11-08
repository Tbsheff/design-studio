import type { RefObject } from "react";

import type { Rect } from "./snap-model.js";

const ITEM_1 = 1;

const ITEM_2 = 2;

const ITEM_5 = 5;

const ITEM_10 = 10;

const ITEM_20 = 20;

const ITEM_50 = 50;

const ITEM_100 = 100;

const ITEM_200 = 200;

const ITEM_500 = 500;

const ITEM_1000 = 1000;

const ITEM_2000 = 2000;

const ITEM_5000 = 5000;

const ITEM_10_000 = 10_000;

const POS_0_5 = 0.5;

const X_1 = 1;

const Y_2 = 2;

const ZOOM_3 = 3;

const NUMBER_1 = 1;

const AT_NEG_1 = -1;

const DEVICE_PIXEL_RATIO_1 = 1;

const SET_TRANSFORM_0 = 0;

const WIDTH_6 = 6;

const WIDTH_2 = 2;

const POS_3 = 3;

const FILL_TEXT_9 = 9;

const TRANSLATE_9 = 9;

const PI_2 = 2;

const FILL_TEXT_0 = 0;

const FILL_RECT_0 = 0;

const ARGUMENT_0 = 0;

const ARGUMENT11_1 = 1;

const HI_1 = 1;

const ARGUMENT2_0 = 0;

const ARGUMENT12_1 = 1;

const FILL_RECT_1 = 1;

const WIDTH3_2 = 2;

const RULER_SIZE_2 = 2;

const STEP_5 = 5;

const OFFSET_0 = 0;

const INDEX_5 = 5;

const INDEX_1 = 1;

const TICK_4 = 4;

const RULER_SIZE_1 = 1;

const RULER_SIZE = 20;

const STEPS = [
  ITEM_1,
  ITEM_2,
  ITEM_5,
  ITEM_10,
  ITEM_20,
  ITEM_50,
  ITEM_100,
  ITEM_200,
  ITEM_500,
  ITEM_1000,
  ITEM_2000,
  ITEM_5000,
  ITEM_10_000,
];

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

const tick = (axisDrawValue: AxisDraw, pos: number, len: number): void => {
  if (axisDrawValue.vertical) {
    axisDrawValue.ctx.moveTo(RULER_SIZE - len, pos + POS_0_5);
    axisDrawValue.ctx.lineTo(RULER_SIZE, pos + POS_0_5);
  } else {
    axisDrawValue.ctx.moveTo(pos + POS_0_5, RULER_SIZE - len);
    axisDrawValue.ctx.lineTo(pos + POS_0_5, RULER_SIZE);
  }
};

interface Colors {
  bg: string;
  tick: string;
  text: string;
  mark: string;
  markText: string;
  line: string;
}

const viewOf = (el: HTMLElement | null): View | null => {
  let match: RegExpExecArray | null = null;

  if (el) {
    match =
      /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/.exec(
        el.style.transform
      );
  }

  if (!match) {
    return null;
  }

  return {
    x: Number(match[X_1]),
    y: Number(match[Y_2]),
    zoom: Number(match[ZOOM_3]) || NUMBER_1,
  };
};

const stepFor = (zoom: number): number =>
  STEPS.find((textValue) => textValue * zoom >= MIN_LABEL_PX) ??
  (STEPS.at(AT_NEG_1) as number);

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
  const dpr = window.devicePixelRatio || DEVICE_PIXEL_RATIO_1;
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
  ctx?.setTransform(
    dpr,
    SET_TRANSFORM_0,
    SET_TRANSFORM_0,
    dpr,
    SET_TRANSFORM_0,
    SET_TRANSFORM_0
  );

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

const markSpans = (axisDraw3: AxisDraw): [number, number][] => {
  if (!axisDraw3.range) {
    return [];
  }

  return axisDraw3.range.map((value) => {
    const pos = toScreen(axisDraw3, value);

    const half =
      (axisDraw3.ctx.measureText(String(Math.round(value))).width + WIDTH_6) /
        WIDTH_2 +
      WIDTH_2;

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

  let result: [number, number] = [pos + POS_3, pos + POS_3 + width];

  if (axisDraw4.vertical) {
    result = [pos - POS_3 - width, pos - POS_3];
  }

  const [from, to] = result;

  if (marks.some(([lo, hi]) => from < hi && to > lo)) {
    return;
  }

  if (!axisDraw4.vertical) {
    ctx.fillText(text, pos + POS_3, FILL_TEXT_9);

    return;
  }

  ctx.save();
  ctx.translate(TRANSLATE_9, pos - POS_3);
  ctx.rotate(-Math.PI / PI_2);
  ctx.fillText(text, FILL_TEXT_0, FILL_TEXT_0);
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
    axisDraw5.ctx.fillRect(FILL_RECT_0, lo, RULER_SIZE, hi - lo);
  } else {
    axisDraw5.ctx.fillRect(lo, FILL_RECT_0, hi - lo, RULER_SIZE);
  }

  axisDraw5.ctx.globalAlpha = 1;

  let argument: number = lo;

  if (axisDraw5.vertical) {
    argument = ARGUMENT_0;
  }

  let argument5 = 0;

  if (axisDraw5.vertical) {
    argument5 = lo;
  }

  let argument9: 20 | 1 = 1;

  if (axisDraw5.vertical) {
    argument9 = RULER_SIZE;
  }

  let argument11: 20 | 1 = RULER_SIZE;

  if (axisDraw5.vertical) {
    argument11 = ARGUMENT11_1;
  }

  axisDraw5.ctx.fillRect(argument, argument5, argument9, argument11);

  let argument2: number = hi - HI_1;

  if (axisDraw5.vertical) {
    argument2 = ARGUMENT2_0;
  }

  let argument6 = 0;

  if (axisDraw5.vertical) {
    argument6 = hi - HI_1;
  }

  let argument10: 20 | 1 = 1;

  if (axisDraw5.vertical) {
    argument10 = RULER_SIZE;
  }

  let argument12: 20 | 1 = RULER_SIZE;

  if (axisDraw5.vertical) {
    argument12 = ARGUMENT12_1;
  }

  axisDraw5.ctx.fillRect(argument2, argument6, argument10, argument12);
};

const drawRangeLabels = (axisDraw6: AxisDraw): void => {
  if (!axisDraw6.range) {
    return;
  }

  axisDraw6.ctx.fillStyle = axisDraw6.colors.mark;

  for (const value of axisDraw6.range) {
    const pos = toScreen(axisDraw6, value);
    const text = String(Math.round(value));
    const width3 = axisDraw6.ctx.measureText(text).width + WIDTH_6;

    if (axisDraw6.vertical) {
      axisDraw6.ctx.fillRect(
        FILL_RECT_1,
        pos - width3 / WIDTH3_2,
        RULER_SIZE - RULER_SIZE_2,
        width3
      );
    } else {
      axisDraw6.ctx.fillRect(
        pos - width3 / WIDTH3_2,
        FILL_RECT_1,
        width3,
        RULER_SIZE - RULER_SIZE_2
      );
    }

    axisDraw6.ctx.fillStyle = axisDraw6.colors.markText;
    axisDraw6.ctx.save();
    axisDraw6.ctx.textAlign = "center";
    axisDraw6.ctx.textBaseline = "middle";

    let argument3: number = pos;

    if (axisDraw6.vertical) {
      argument3 = RULER_SIZE / RULER_SIZE_2;
    }

    let argument7: number = RULER_SIZE / RULER_SIZE_2;

    if (axisDraw6.vertical) {
      argument7 = pos;
    }

    axisDraw6.ctx.translate(argument3, argument7);

    if (axisDraw6.vertical) {
      axisDraw6.ctx.rotate(-Math.PI / PI_2);
    }

    axisDraw6.ctx.fillText(text, FILL_TEXT_0, FILL_TEXT_0);
    axisDraw6.ctx.restore();
    axisDraw6.ctx.fillStyle = axisDraw6.colors.mark;
  }
};

const drawAxis = (axisDraw: AxisDraw): void => {
  const { ctx } = axisDraw;
  ctx.fillStyle = axisDraw.colors.bg;

  let argument4: number = axisDraw.length;

  if (axisDraw.vertical) {
    argument4 = RULER_SIZE;
  }

  let argument8: number = RULER_SIZE;

  if (axisDraw.vertical) {
    argument8 = axisDraw.length;
  }

  ctx.fillRect(FILL_RECT_0, FILL_RECT_0, argument4, argument8);
  drawRange(axisDraw);
  const step = stepFor(axisDraw.zoom);
  const minor = step / STEP_5;
  const first =
    Math.floor(
      (axisDraw.origin + (OFFSET_0 - axisDraw.offset) / axisDraw.zoom) / step
    ) * step;
  const last =
    axisDraw.origin + (axisDraw.length - axisDraw.offset) / axisDraw.zoom;
  ctx.strokeStyle = axisDraw.colors.tick;
  ctx.fillStyle = axisDraw.colors.text;
  ctx.lineWidth = 1;
  const marks = markSpans(axisDraw);
  ctx.beginPath();

  for (let value4 = first; value4 <= last; value4 += step) {
    const pos = Math.round(toScreen(axisDraw, value4));
    tick(axisDraw, pos, RULER_SIZE);
    label(axisDraw, pos, String(Math.round(value4)), marks);

    for (let index = 1; index < INDEX_5; index += INDEX_1) {
      tick(
        axisDraw,
        Math.round(toScreen(axisDraw, value4 + minor * index)),
        TICK_4
      );
    }
  }

  ctx.stroke();
  ctx.fillStyle = axisDraw.colors.line;

  if (axisDraw.vertical) {
    ctx.fillRect(
      RULER_SIZE - RULER_SIZE_1,
      FILL_RECT_0,
      FILL_RECT_1,
      axisDraw.length
    );
  } else {
    ctx.fillRect(
      FILL_RECT_0,
      RULER_SIZE - RULER_SIZE_1,
      axisDraw.length,
      FILL_RECT_1
    );
  }

  drawRangeLabels(axisDraw);
};

export { RULER_SIZE, colorsOf, drawAxis, sizeCanvas, viewOf };

export type { Props };
