import type { CSSProperties } from "react";

const STEP_PX = 16;
const SHIFT_STEP_PX = 48;
const MIN_CHAT = 300;
const MAX_CHAT = 640;
const HALF = 2;

const clampWidth = (width: number, container: number): number => {
  const max = Math.max(
    MIN_CHAT,
    Math.min(MAX_CHAT, Math.floor(container / HALF))
  );

  return Math.round(Math.max(MIN_CHAT, Math.min(max, width)));
};

const chatWidthStyle = (width: number | null): CSSProperties => {
  if (width === null) {
    return {};
  }

  return { "--chat-w": `${width}px` } as CSSProperties;
};

const toKeyDelta = (key: string, isShift: boolean): number => {
  let step = STEP_PX;

  if (isShift) {
    step = SHIFT_STEP_PX;
  }

  if (key === "ArrowRight") {
    return step;
  }

  if (key === "ArrowLeft") {
    return -step;
  }

  return 0;
};

export { MAX_CHAT, MIN_CHAT, chatWidthStyle, clampWidth, toKeyDelta };
