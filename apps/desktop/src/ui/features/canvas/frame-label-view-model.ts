import { frameName } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { frameBaseName } from "./frame-label-model.js";
import type { FrameBadge } from "./frame-label-model.js";

const SIZE_100 = 100;

const SIZE_10 = 10;

const NUDGE = new Map<string, readonly [number, number]>([
  ["ArrowDown", [0, 1]],
  ["ArrowLeft", [-1, 0]],
  ["ArrowRight", [1, 0]],
  ["ArrowUp", [0, -1]],
]);

interface FrameLabelView {
  readonly className: string;
  readonly hasSize: boolean;
  readonly heading: string;
  readonly name: string;
  readonly size: string;
  readonly tip: string;
}

const toLabelClassName = (
  active: boolean,
  badge: FrameBadge | undefined
): string => {
  const classes = ["frame-label"];

  if (active) {
    classes.push("active");
  }

  if (badge) {
    classes.push("variation");
  }

  if (badge?.current) {
    classes.push("current");
  }

  return classes.join(" ");
};

const toTipPrefix = (
  frame: CanvasFrame,
  badge: FrameBadge | undefined,
  title: string | undefined
): string => {
  if (badge) {
    return `${frameName(frame)} · `;
  }

  if (title && title !== frame.label) {
    return `${title} · `;
  }

  return "";
};

const toLabelView = (
  frame: CanvasFrame,
  badge: FrameBadge | undefined,
  title: string | undefined,
  active: boolean
): FrameLabelView => {
  let label = frameBaseName(frame);
  let caption = label;
  let action = "Click to edit, double-click to zoom";

  if (badge) {
    label = `Variation ${badge.label}`;
    caption = badge.title;
  }

  if (active) {
    action = "Drag to move, double-click to zoom";
  }

  const sizeText = `${frame.width} × ${frame.height}`;

  return {
    className: toLabelClassName(active, badge),
    hasSize: caption !== sizeText,
    heading: caption,
    name: label,
    size: sizeText,
    tip: `${toTipPrefix(frame, badge, title)}${action}`,
  };
};

const toNudgeStep = (
  key: string,
  isShift: boolean
): readonly [number, number] | null => {
  const step = NUDGE.get(key);

  if (!step) {
    return null;
  }

  let distance: number = SIZE_10;

  if (isShift) {
    distance = SIZE_100;
  }

  return [step[0] * distance, step[1] * distance];
};

export { toLabelView, toNudgeStep };

export type { FrameLabelView };
