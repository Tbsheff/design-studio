import type { LinkRect, PlayKey, ProjectKind } from "@design-studio/contracts";
import {
  easingCss,
  LINK_DURATION_DEFAULT,
  LINK_EASING_DEFAULT,
  linkDuration,
} from "@design-studio/contracts/links";
import type {
  LinksFile,
  LinkTransition,
  PrototypeLink,
} from "@design-studio/contracts/links";
import type { CSSProperties } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { hasOutgoing } from "./prototype-model.js";

type Phase = "loading" | "enter" | "run" | "shown" | "closing";

type OverlayKind = "modal" | "drawer";

interface Motion {
  transition: LinkTransition;
  duration: number;
  easing: string;
}

interface Slot extends Motion {
  key: string;
  frame: CanvasFrame;
  src: string;
  token: string;
  phase: Phase;
  overlay: OverlayKind | null;
}

interface PlayModeProps {
  kind: ProjectKind;
  projectId: string;
  file: LinksFile;
  frames: CanvasFrame[];
  startId: string;
  sandbox?: string;
  urlOf: (frame: CanvasFrame) => Promise<string | null>;
  frameTitle: (frame: CanvasFrame) => string;
  onClose: () => void;
  onRestoreFocus: () => void;
}

interface LayerShot {
  token: string;
  at: number;
  layers: Record<string, LinkRect>;
}

interface StageSize {
  readonly width: number;
  readonly height: number;
}

const NO_BRIDGE_MS = 1500;

const LAYERS_FRESH_MS = 1500;

const SETTLE_PAD_MS = 40;

const DRAWER_CHROME = 56;

const DRAWER_WIDTH_RATIO = 0.9;

const MODAL_WIDTH_CHROME = 120;

const MODAL_HEIGHT_CHROME = 180;

const BASE_WIDTH_CHROME = 48;

const BASE_HEIGHT_CHROME = 120;

const INSTANT: Motion = {
  duration: LINK_DURATION_DEFAULT,
  easing: LINK_EASING_DEFAULT,
  transition: "instant",
};

const motionOf = (link: PrototypeLink): Motion => ({
  duration: linkDuration(link),
  easing: easingCss(link.easing),
  transition: link.transition,
});

const scaleFor = (slot: Slot, stage: StageSize): number => {
  const { frame } = slot;

  if (slot.overlay === "drawer") {
    return Math.min(
      1,
      (stage.height - DRAWER_CHROME) / frame.height,
      (stage.width * DRAWER_WIDTH_RATIO) / frame.width
    );
  }

  if (slot.overlay === "modal") {
    return Math.min(
      1,
      (stage.width - MODAL_WIDTH_CHROME) / frame.width,
      (stage.height - MODAL_HEIGHT_CHROME) / frame.height
    );
  }

  return Math.min(
    1,
    (stage.width - BASE_WIDTH_CHROME) / frame.width,
    (stage.height - BASE_HEIGHT_CHROME) / frame.height
  );
};

const slotClass = (slot: Slot, isLeaving: boolean): string => {
  const names = ["play-slot", `t-${slot.transition}`];

  if (slot.overlay) {
    names.push(`overlay-${slot.overlay}`);
  }

  names.push(slot.phase);

  if (isLeaving) {
    names.push("leaving");
  }

  return names.join(" ");
};

const slotStyle = (motion: Motion): CSSProperties =>
  ({
    "--play-ease": motion.easing,
    "--play-ms": `${motion.duration}ms`,
  }) as CSSProperties;

const baseOf = (slots: Slot[]): Slot[] => slots.filter((slot) => !slot.overlay);

const overlayOf = (slots: Slot[]): Slot | null =>
  slots.find((slot) => slot.overlay) ?? null;

const withPhase = (prev: Slot[], token: string, phase: Phase): Slot[] =>
  prev.map((item) => {
    if (item.token === token) {
      return { ...item, phase };
    }

    return item;
  });

const settled = (prev: Slot[], token: string): Slot[] => {
  const target = prev.find((item) => item.token === token);

  if (!target) {
    return prev;
  }

  if (target.overlay) {
    return withPhase(prev, token, "shown");
  }

  const at = prev.indexOf(target);
  const kept: Slot[] = [];

  for (const [index, item] of prev.entries()) {
    if (index >= at || item.overlay) {
      kept.push(item);
    }
  }

  return withPhase(kept, token, "shown");
};

const isSettledPhase = (slot: Slot): boolean =>
  slot.phase === "shown" || slot.phase === "run";

const placed = (prev: Slot[], slot: Slot): Slot[] => {
  if (slot.overlay) {
    return [...baseOf(prev), slot];
  }

  const keptBase = baseOf(prev).filter((item) => isSettledPhase(item));

  return [...keptBase.slice(-1), slot];
};

const keyOf = (event: KeyboardEvent): PlayKey | null => {
  if (event.key === "Escape") {
    return "exit";
  }

  if (event.key === "r" || event.key === "R") {
    return "restart";
  }

  if (event.key === "Backspace" || event.key === "ArrowLeft") {
    return "back";
  }

  return null;
};

const playHint = (
  props: PlayModeProps,
  hasOverlay: boolean,
  shown: CanvasFrame | null
): string => {
  if (props.file.links.length === 0) {
    return "No links yet. Use the Prototype tool to link frames.";
  }

  if (hasOverlay) {
    return "Click outside or press Esc to close";
  }

  if (shown && !hasOutgoing(props.file, shown.id)) {
    return "No links here. Esc, then link elements in Prototype.";
  }

  return "Click a linked element";
};

const toShownFrame = (slots: Slot[]): CanvasFrame | null => {
  const overlay = overlayOf(slots);

  if (overlay && overlay.phase !== "closing") {
    return overlay.frame;
  }

  const base = baseOf(slots);
  const lastSettled = base.findLast((slot) => isSettledPhase(slot));

  return lastSettled?.frame ?? base.at(-1)?.frame ?? null;
};

export {
  baseOf,
  INSTANT,
  keyOf,
  LAYERS_FRESH_MS,
  motionOf,
  NO_BRIDGE_MS,
  overlayOf,
  placed,
  playHint,
  scaleFor,
  SETTLE_PAD_MS,
  settled,
  slotClass,
  slotStyle,
  toShownFrame,
  withPhase,
};

export type {
  LayerShot,
  Motion,
  OverlayKind,
  Phase,
  PlayModeProps,
  Slot,
  StageSize,
};
