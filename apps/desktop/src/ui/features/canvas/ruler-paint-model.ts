import {
  RULER_SIZE,
  colorsOf,
  drawAxis,
  sizeCanvas,
  viewOf,
} from "./ruler-draw.js";
import type { Props } from "./ruler-draw.js";

interface RulerTargets {
  readonly left: HTMLCanvasElement | null;
  readonly root: HTMLElement | null;
  readonly top: HTMLCanvasElement | null;
}

type RulerInput = Pick<Props, "origin" | "selection">;

interface RulerScene {
  readonly colors: ReturnType<typeof colorsOf>;
  readonly font: string;
  readonly input: RulerInput;
  readonly view: NonNullable<ReturnType<typeof viewOf>>;
}

const toRange = (
  input: RulerInput,
  isVertical: boolean
): [number, number] | null => {
  const { origin, selection } = input;

  if (!selection) {
    return null;
  }

  if (isVertical) {
    return [origin.y + selection.y, origin.y + selection.y + selection.height];
  }

  return [origin.x + selection.x, origin.x + selection.x + selection.width];
};

const paintAxis = (
  scene: RulerScene,
  canvas: HTMLCanvasElement,
  isVertical: boolean
): void => {
  const context = sizeCanvas(canvas);

  if (!context) {
    return;
  }

  context.font = scene.font;

  let size: number = canvas.clientWidth;
  let operand: number = scene.view.x;
  let start: number = scene.input.origin.x;

  if (isVertical) {
    size = canvas.clientHeight;
    operand = scene.view.y;
    start = scene.input.origin.y;
  }

  drawAxis({
    colors: scene.colors,
    ctx: context,
    length: size,
    offset: operand - RULER_SIZE,
    origin: start,
    range: toRange(scene.input, isVertical),
    vertical: isVertical,
    zoom: scene.view.zoom,
  });
};

const paintRulers = (
  targets: RulerTargets,
  artboard: HTMLElement | null,
  input: RulerInput
): void => {
  const view = viewOf(artboard);
  const { left, root, top } = targets;

  if (!view || !root || !top || !left) {
    return;
  }

  const scene: RulerScene = {
    colors: colorsOf(root),
    font: `500 9px ${getComputedStyle(root).fontFamily}`,
    input,
    view,
  };

  paintAxis(scene, top, false);
  paintAxis(scene, left, true);
};

export { paintRulers };

export type { RulerInput, RulerTargets };
