import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { frameBaseName } from "./frame-label-model.js";
import type { LabelProps } from "./frame-label.js";
import type { FrameLiveSources } from "./frame-still-model.js";

interface PassiveProps {
  frame: CanvasFrame;
  src: string | null;
  nextSrc: string | null;
  pending?: { step: string | null; missing: boolean };
  sandbox?: string;
  offset: { x: number; y: number };
  label: LabelProps;
  register: (id: string, el: HTMLDivElement | null) => void;
  frameRef?: (el: HTMLIFrameElement | null) => void;
  onNextLoad: (id: string) => void;
  projectId: string;
  sources: FrameLiveSources;
}

interface PassiveUrl {
  readonly url: string;
  readonly isNext: boolean;
}

const toFrameName = (label: LabelProps, frame: CanvasFrame): string => {
  if (label.badge) {
    return `Variation ${label.badge.label}`;
  }

  return frameBaseName(frame);
};

const toPassiveUrls = (
  isLive: boolean,
  src: string | null,
  nextSrc: string | null
): PassiveUrl[] => {
  const urls: PassiveUrl[] = [];

  if (!isLive) {
    return urls;
  }

  if (src) {
    urls.push({ isNext: false, url: src });
  }

  if (nextSrc) {
    urls.push({ isNext: true, url: nextSrc });
  }

  return urls;
};

const toFrontRef = (
  isNext: boolean,
  frameRef: PassiveProps["frameRef"]
): ((el: HTMLIFrameElement | null) => void) | null => {
  if (isNext || !frameRef) {
    return null;
  }

  return frameRef;
};

const toMissingPage = (
  pending: { missing: boolean },
  page: string
): string | undefined => {
  if (pending.missing) {
    return page;
  }
};

const toPassiveStyle = (
  frame: CanvasFrame,
  offset: { x: number; y: number }
): CSSProperties => ({
  height: frame.height,
  left: frame.x - offset.x,
  top: frame.y - offset.y,
  width: frame.width,
});

const routeHitPointerDown = (
  label: LabelProps,
  frame: CanvasFrame,
  event: ReactPointerEvent
): void => {
  if (label.onBodyPointerDown) {
    label.onBodyPointerDown(event, frame, true);

    return;
  }

  label.onPointerDown(event, frame);
};

export {
  routeHitPointerDown,
  toFrameName,
  toFrontRef,
  toMissingPage,
  toPassiveStyle,
  toPassiveUrls,
};

export type { PassiveProps, PassiveUrl };
