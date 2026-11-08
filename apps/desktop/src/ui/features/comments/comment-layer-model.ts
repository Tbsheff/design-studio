import type { ActiveFrame } from "./comment-anchors.js";
import type { ComposerSubmit } from "./comment-composer-model.js";
import { breadcrumbOf } from "./comment-placement.js";
import type { Breadcrumb, PinOffset } from "./comment-placement.js";
import { mentionLabel } from "./deps.js";
import type {
  CommentDrawing,
  DesignComment,
  SelectionContext,
} from "./deps.js";

type Rect = SelectionContext["rect"];

interface PinTarget {
  readonly offset?: PinOffset;
  readonly rect: Rect;
}

interface FrameSize {
  readonly height: number;
  readonly width: number;
}

const PIN_SIZE = 28;

const LABEL_MAX_H = 96;

const KEY_MARK = "\n";

const drawingAnchor = (drawing: CommentDrawing): Rect => {
  const points = drawing.strokes[0]?.points ?? [];
  const x = points[0] ?? drawing.box.x;
  const startY = points[1] ?? drawing.box.y;
  const height = PIN_SIZE;
  const width = Math.max(1, drawing.box.x + drawing.box.width - x);
  const y = startY - PIN_SIZE / 2;

  return { height, width, x, y };
};

const selectionKey = (selection: SelectionContext[]): string =>
  selection.map((item) => item.selector).join(KEY_MARK);

const toActiveFrame = (key: string): ActiveFrame | null => {
  if (key === "") {
    return null;
  }

  const [id = "", path = "", ...ids] = key.split(KEY_MARK);

  return { id, ids, path };
};

const toActiveKey = (active: ActiveFrame | null): string => {
  if (!active) {
    return "";
  }

  return [active.id, active.path, ...active.ids].join(KEY_MARK);
};

const pinTarget = (
  comment: DesignComment,
  rect: Rect,
  zoom: number,
  frame: { width: number }
): PinTarget => {
  if (comment.drawing) {
    return { rect };
  }

  if (rect.height > LABEL_MAX_H) {
    return { offset: comment.target.offset, rect };
  }

  const fitsRight = rect.x + rect.width + PIN_SIZE / zoom <= frame.width;

  if (fitsRight) {
    return { rect };
  }

  return { rect: { ...rect, width: 1, x: rect.x + rect.width - 1 } };
};

const isVisible = (rect: Rect, frame: FrameSize): boolean =>
  rect.y + rect.height > 0 &&
  rect.y < frame.height &&
  rect.x + rect.width > 0 &&
  rect.x < frame.width;

const withMentions = (
  text: string,
  mentions: ComposerSubmit["mentions"]
): string => {
  if (mentions.length === 0) {
    return text;
  }

  const labels = mentions.map((mention) => `@${mentionLabel(mention)}`);

  return `${text} (see ${labels.join(", ")})`;
};

const toThreadCrumb = (
  comment: DesignComment,
  pageName: string
): Breadcrumb | null => {
  if (comment.drawing) {
    const label = `${pageName} › Drawing`;

    return { full: label, short: label };
  }

  if (comment.context) {
    return breadcrumbOf(pageName, [comment.context]);
  }

  return null;
};

export {
  drawingAnchor,
  isVisible,
  pinTarget,
  selectionKey,
  toActiveFrame,
  toActiveKey,
  toThreadCrumb,
  withMentions,
};

export type { FrameSize, Rect };
