import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

import type { SelectionContext } from "./deps.js";

type Rect = SelectionContext["rect"];

interface Size {
  width: number;
  height: number;
}

export const PIN_SIZE = 28;

export const CARD_WIDTH = 400;

const GAP = 8;

export type CardSide = "right" | "left" | "below" | "above" | "over";

export interface PinPlacement {
  left: number;
  top: number;
  flip: boolean;
}

export interface ComposerPlacement {
  side: CardSide;
  pin: PinPlacement;
  card: { left: number; top: number };
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, Math.max(min, max)));

export interface PinOffset {
  x: number;
  y: number;
}

const unit = (value: number): number =>
  Number.isFinite(value)
    ? Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000
    : 0;

export const offsetIn = (
  rect: Rect,
  point: { x: number; y: number } | undefined
): PinOffset | undefined => {
  if (!point || rect.width <= 0 || rect.height <= 0) {
    return undefined;
  }
  return {
    x: unit((point.x - rect.x) / rect.width),
    y: unit((point.y - rect.y) / rect.height),
  };
};

export const pinAnchor = (rect: Rect, offset: PinOffset | undefined): Rect => {
  if (!offset) {
    return rect;
  }
  return {
    height: 0,
    width: 0,
    x: rect.x + offset.x * rect.width,
    y: rect.y + offset.y * rect.height,
  };
};

export const pinPlacement = (
  target: Rect,
  zoom: number,
  frame: Size,
  offset?: PinOffset
): PinPlacement => {
  const rect = pinAnchor(target, offset);
  const pin = PIN_SIZE / zoom;
  const right = rect.x + rect.width;
  const flip = right + pin > frame.width;
  const left = flip ? rect.x - pin : right;

  return {
    flip,
    left: clamp(left, 0, frame.width - pin),
    top: clamp(rect.y, 0, frame.height - pin),
  };
};

interface FitBox {
  height: number;
  left: number;
  top: number;
  width: number;
}

const fits = (box: FitBox, frame: Size): boolean =>
  box.left >= 0 &&
  box.top >= 0 &&
  box.left + box.width <= frame.width &&
  box.top + box.height <= frame.height;

interface PlaceView {
  card: Size;
  frame: Size;
  zoom: number;
}

const SIDE_ORDER: CardSide[] = ["right", "left", "below", "above"];

const placeAround = (
  rect: Rect,
  view: PlaceView,
  prefer?: CardSide
): ComposerPlacement => {
  const { card, frame, zoom } = view;
  const s = 1 / zoom;
  const pin = PIN_SIZE * s;
  const gap = GAP * s;
  const width = card.width * s;
  const height = card.height * s;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const vertical = clamp(rect.y, 0, frame.height - height);

  const options: Record<CardSide, ComposerPlacement> = {
    above: {
      card: {
        left: clamp(rect.x + pin + gap, 0, frame.width - width),
        top: rect.y - gap - height,
      },
      pin: { flip: false, left: rect.x, top: rect.y - gap - pin },
      side: "above",
    },
    below: {
      card: {
        left: clamp(rect.x + pin + gap, 0, frame.width - width),
        top: bottom + gap,
      },
      pin: { flip: false, left: rect.x, top: bottom + gap },
      side: "below",
    },
    left: {
      card: { left: rect.x - pin - gap - width, top: vertical },
      pin: { flip: true, left: rect.x - pin, top: rect.y },
      side: "left",
    },
    over: {
      card: {
        left: clamp(rect.x + pin + gap, 0, frame.width - width),
        top: vertical,
      },
      pin: { flip: false, left: rect.x, top: rect.y },
      side: "over",
    },
    right: {
      card: { left: right + pin + gap, top: vertical },
      pin: { flip: false, left: right, top: rect.y },
      side: "right",
    },
  };

  const fitting = (side: CardSide) => {
    const option = options[side];

    return (
      fits({ ...option.card, height, width }, frame) &&
      fits({ ...option.pin, height: pin, width: pin }, frame)
    );
  };

  const side =
    prefer && prefer !== "over" && fitting(prefer)
      ? prefer
      : (SIDE_ORDER.find(fitting) ?? "over");

  const chosen = options[side];
  return {
    card: {
      left: clamp(chosen.card.left, 0, frame.width - width),
      top: clamp(chosen.card.top, 0, frame.height - height),
    },
    pin: {
      ...chosen.pin,
      left: clamp(chosen.pin.left, 0, frame.width - pin),
      top: clamp(chosen.pin.top, 0, frame.height - pin),
    },
    side,
  };
};

export const placeComposer = (
  target: Rect,
  view: PlaceView,
  prefer?: CardSide,
  offset?: PinOffset
): ComposerPlacement => {
  const placed = placeAround(pinAnchor(target, offset), view, prefer);

  if (!offset) {
    return placed;
  }
  const pin = pinPlacement(target, view.zoom, view.frame, offset);

  return { ...placed, pin };
};

export const useCardSize = (card: RefObject<HTMLDivElement | null>) => {
  const [height, setHeight] = useState(112);
  useLayoutEffect(() => {
    const element = card.current;

    if (!element) {
      return;
    }
    setHeight(element.offsetHeight);
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);

    return () => observer.disconnect();
  }, [card]);

  return { height, width: CARD_WIDTH };
};

const TEXT_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "label",
  "strong",
  "em",
  "small",
  "li",
  "blockquote",
  "figcaption",
  "dt",
  "dd",
  "td",
  "th",
]);

const KIND_OF_TAG: Record<string, string> = {
  a: "link",
  button: "button",
  footer: "footer",
  form: "form",
  header: "header",
  img: "image",
  input: "field",
  nav: "nav",
  picture: "image",
  select: "field",
  svg: "icon",
  textarea: "field",
  video: "video",
};

const snippet = (text: string, max: number): string => {
  const line = text.replaceAll(/\s+/gu, " ").trim();

  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

const className = (selection: SelectionContext): string | null => {
  const match = /^<[^>]*\bclass="([^"]*)"/u.exec(
    selection.outerHTML.slice(0, 4000)
  );

  const first = match?.[1]?.trim().split(/\s+/u)[0];

  return first || null;
};

export const elementLabel = (selection: SelectionContext): string => {
  const tag = selection.tag.toLowerCase();
  const text = snippet(selection.text, 32);
  const kind = TEXT_TAGS.has(tag) ? "text" : (KIND_OF_TAG[tag] ?? null);

  if (kind && text) {
    return `${kind} “${text}”`;
  }
  if (kind) {
    return kind;
  }
  const cls = className(selection);

  if (cls) {
    return `${tag}.${cls}`;
  }
  return text ? `${tag} “${text}”` : tag;
};

export interface Breadcrumb {
  short: string;
  full: string;
}

const parentLabel = (selection: SelectionContext): string | null => {
  const meaningful = selection.ancestors.find(
    (label) =>
      label.includes(".") ||
      [
        "section",
        "header",
        "footer",
        "nav",
        "main",
        "aside",
        "form",
        "article",
      ].includes(label)
  );

  return meaningful ?? null;
};

export const breadcrumbOf = (
  page: string,
  selections: SelectionContext[]
): Breadcrumb => {
  const last = selections.at(-1);

  if (!last) {
    return { full: page, short: page };
  }
  if (selections.length > 1) {
    const full = [page, ...selections.map(elementLabel)].join(" › ");

    return { full, short: `${page} › ${selections.length} elements` };
  }

  const parent = parentLabel(last);
  const element = elementLabel(last);

  const chain = [...last.ancestors]
    .toReversed()
    .filter((label) => label !== "html");

  return {
    full: [page, ...chain, element].join(" › "),
    short: [page, parent, element]
      .filter((part): part is string => Boolean(part))
      .join(" › "),
  };
};

export const scopeText = (
  breadcrumb: Breadcrumb,
  selections: SelectionContext[],
  text: string
): string => {
  const selectors = selections
    .map((selection) => `\`${selection.selector}\``)
    .join(", ");

  return `About ${breadcrumb.short} (${selectors}): ${text}`;
};
