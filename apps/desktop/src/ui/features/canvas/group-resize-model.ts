import type { SelectionContext } from "@design-studio/contracts";

import {
  PX_UNIT,
  toGroupAnchor,
  toPlaceStyle,
  toPx,
  toSnapped,
} from "./group-resize-anchor-model.js";
import type { GroupAnchor } from "./group-resize-anchor-model.js";
import { toPixels } from "./resize-handles-model.js";

type GroupEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface GroupBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface GroupDelta {
  readonly dx: number;
  readonly dy: number;
}

interface GroupMode {
  readonly isCentered: boolean;
  readonly isRatio: boolean;
}

interface GroupFactor {
  readonly originX: number;
  readonly originY: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

interface GroupLayer extends GroupAnchor {
  readonly height: number;
  readonly isAbsolute: boolean;
  readonly isHeightFixed: boolean;
  readonly isWidthFixed: boolean;
  readonly left: number;
  readonly rect: GroupBox;
  readonly snapHeight: number;
  readonly snapLeft: number;
  readonly snapTop: number;
  readonly snapWidth: number;
  readonly top: number;
  readonly width: number;
}

type GroupKey = "bottom" | "height" | "left" | "right" | "top" | "width";

type GroupStyle = Readonly<Partial<Record<GroupKey, string>>>;

interface GroupEdit {
  readonly component?: string;
  readonly selector: string;
  readonly source: SelectionContext["source"];
  readonly style: GroupStyle;
  readonly tag?: string;
}

interface GroupBatchBody {
  readonly directionId: string;
  readonly edits: readonly GroupEdit[];
  readonly projectId: string;
}

interface GroupScale {
  readonly scaleX: number;
  readonly scaleY: number;
}

interface Sign {
  readonly x: number;
  readonly y: number;
}

const GROUP_EDGES: readonly GroupEdge[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

const SCALE_STEP_PX = 4;

const MIN_SCALE = 0.05;

const MIN_DRAG_PX = 2;

const MOVED_POSITIONS: ReadonlySet<string> = new Set(["absolute", "fixed"]);

const AUTO_SIZES: ReadonlySet<string> = new Set([
  "",
  "auto",
  "fit-content",
  "max-content",
  "min-content",
]);

const SCALE_CLASSES = {
  height: /^(?:h|size)-(?:\d|px$)/u,
  left: /^-?left-(?:\d|px$)/u,
  top: /^-?top-(?:\d|px$)/u,
  width: /^(?:w|size)-(?:\d|px$)/u,
} as const;

const toSignOf = (part: string, minus: string, plus: string): number => {
  if (part.includes(minus)) {
    return -1;
  }

  if (part.includes(plus)) {
    return 1;
  }

  return 0;
};

const toEdgeSign = (edge: GroupEdge): Sign => ({
  x: toSignOf(edge, "w", "e"),
  y: toSignOf(edge, "n", "s"),
});

const toAxisScale = (
  size: number,
  sign: number,
  move: number,
  reach: number
): number => {
  if (sign === 0 || size <= 0) {
    return 1;
  }

  return Math.max(MIN_SCALE, (size + sign * move * reach) / size);
};

const toOrigin = (
  start: number,
  size: number,
  sign: number,
  isCentered: boolean
): number => {
  if (isCentered || sign === 0) {
    return start + size / 2;
  }

  if (sign > 0) {
    return start;
  }

  return start + size;
};

const toRatioScale = (
  sign: Sign,
  scaleX: number,
  scaleY: number
): GroupScale => {
  if (sign.x === 0) {
    return { scaleX: scaleY, scaleY };
  }

  if (sign.y === 0) {
    return { scaleX, scaleY: scaleX };
  }

  if (Math.abs(scaleX - 1) >= Math.abs(scaleY - 1)) {
    return { scaleX, scaleY: scaleX };
  }

  return { scaleX: scaleY, scaleY };
};

const toReach = (isCentered: boolean): number => {
  if (isCentered) {
    return 2;
  }

  return 1;
};

const toGroupFactor = (
  edge: GroupEdge,
  box: GroupBox,
  delta: GroupDelta,
  mode: GroupMode
): GroupFactor => {
  const sign = toEdgeSign(edge);
  const reach = toReach(mode.isCentered);
  let scaleX = toAxisScale(box.width, sign.x, delta.dx, reach);
  let scaleY = toAxisScale(box.height, sign.y, delta.dy, reach);

  if (mode.isRatio) {
    ({ scaleX, scaleY } = toRatioScale(sign, scaleX, scaleY));
  }

  return {
    originX: toOrigin(box.x, box.width, sign.x, mode.isCentered),
    originY: toOrigin(box.y, box.height, sign.y, mode.isCentered),
    scaleX,
    scaleY,
  };
};

const toGroupRect = (box: GroupBox, factor: GroupFactor): GroupBox => ({
  height: box.height * factor.scaleY,
  width: box.width * factor.scaleX,
  x: factor.originX + (box.x - factor.originX) * factor.scaleX,
  y: factor.originY + (box.y - factor.originY) * factor.scaleY,
});

const isGroupDrag = (delta: GroupDelta): boolean =>
  Math.max(Math.abs(delta.dx), Math.abs(delta.dy)) >= MIN_DRAG_PX;

const isScaled = (factor: GroupFactor): boolean =>
  factor.scaleX !== 1 || factor.scaleY !== 1;

const toSnapStep = (
  classes: readonly string[] | null,
  side: keyof typeof SCALE_CLASSES
): number => {
  const pattern = SCALE_CLASSES[side];

  const isOnScale = (classes ?? []).some((token) =>
    pattern.test(token.split(":").at(-1) ?? "")
  );

  if (isOnScale) {
    return SCALE_STEP_PX;
  }

  return 1;
};

const isTextLayer = (target: SelectionContext): boolean => {
  const html = target.outerHTML;
  const open = html.indexOf(">");
  const close = html.lastIndexOf("</");
  let inner = "";

  if (open !== -1 && close > open) {
    inner = html.slice(open + 1, close);
  }

  return target.text !== "" && !/<[a-z]/iu.test(inner);
};

const isAuthored = (value: string | undefined): boolean =>
  !AUTO_SIZES.has(value?.trim() ?? "");

const toGroupLayer = (
  target: SelectionContext,
  classes: readonly string[] | null
): GroupLayer => {
  const { styles } = target;
  const { rect } = target;
  const left = toPx(styles.left);
  const top = toPx(styles.top);
  const isPositioned = MOVED_POSITIONS.has(styles.position ?? "");
  const isText = isTextLayer(target);

  return {
    height: toPixels(styles.height, rect.height),
    isAbsolute: isPositioned && left !== null && top !== null,
    isHeightFixed: !isText || isAuthored(styles["authored-height"]),
    isWidthFixed: !isText || isAuthored(styles["authored-width"]),
    left: left ?? 0,
    rect: target.rect,
    snapHeight: toSnapStep(classes, "height"),
    snapLeft: toSnapStep(classes, "left"),
    snapTop: toSnapStep(classes, "top"),
    snapWidth: toSnapStep(classes, "width"),
    top: top ?? 0,
    width: toPixels(styles.width, rect.width),
    ...toGroupAnchor(target, classes),
  };
};

const toSizeValue = (
  size: number,
  scale: number,
  step: number
): string | null => {
  if (scale === 1) {
    return null;
  }

  const next = Math.max(1, toSnapped(size * scale, step));

  if (next === Math.round(size)) {
    return null;
  }

  return `${next}${PX_UNIT}`;
};

const toEntry = (key: GroupKey, value: string | null): GroupStyle => {
  if (value === null) {
    return {};
  }

  return { [key]: value };
};

const toSizeStyle = (layer: GroupLayer, factor: GroupFactor): GroupStyle => {
  let width: string | null = null;
  let height: string | null = null;

  if (layer.isWidthFixed) {
    width = toSizeValue(layer.width, factor.scaleX, layer.snapWidth);
  }

  if (layer.isHeightFixed) {
    height = toSizeValue(layer.height, factor.scaleY, layer.snapHeight);
  }

  return { ...toEntry("width", width), ...toEntry("height", height) };
};

const toGroupStyle = (layer: GroupLayer, factor: GroupFactor): GroupStyle => {
  const size = toSizeStyle(layer, factor);

  return { ...size, ...toPlaceStyle(layer, factor, size) };
};

const GROUP_KEYS: readonly GroupKey[] = [
  "bottom",
  "height",
  "left",
  "right",
  "top",
  "width",
];

const toStyleKeys = (style: GroupStyle): readonly GroupKey[] =>
  GROUP_KEYS.filter((key) => Object.hasOwn(style, key));

const toBaseValue = (layer: GroupLayer, key: GroupKey): string =>
  `${Math.round(layer[key])}${PX_UNIT}`;

const toPreviewStyle = (
  layer: GroupLayer,
  style: GroupStyle,
  touched: ReadonlySet<GroupKey>
): GroupStyle => {
  const base: Partial<Record<GroupKey, string>> = {};

  for (const key of touched) {
    base[key] = toBaseValue(layer, key);
  }

  return { ...base, ...style };
};

const toTargetFields = (
  target: SelectionContext
): { readonly component: string } | { readonly tag: string } => {
  if (target.component) {
    return { component: target.component };
  }

  return { tag: target.tag.toLowerCase() };
};

const toGroupBatch = (
  ids: { readonly directionId: string; readonly projectId: string },
  targets: readonly SelectionContext[],
  styles: readonly GroupStyle[]
): GroupBatchBody => ({
  directionId: ids.directionId,
  edits: targets.flatMap((target, index) => {
    const style = styles[index] ?? {};

    if (Object.keys(style).length === 0) {
      return [];
    }

    return [
      {
        selector: target.selector,
        source: target.source,
        style,
        ...toTargetFields(target),
      },
    ];
  }),
  projectId: ids.projectId,
});

export {
  GROUP_EDGES,
  isGroupDrag,
  isScaled,
  toGroupBatch,
  toGroupFactor,
  toGroupLayer,
  toGroupRect,
  toGroupStyle,
  toPreviewStyle,
  toStyleKeys,
};

export type {
  GroupBatchBody,
  GroupBox,
  GroupDelta,
  GroupEdge,
  GroupEdit,
  GroupFactor,
  GroupKey,
  GroupLayer,
  GroupMode,
  GroupStyle,
};
