import { useEffect, useRef } from "react";

import type { CanvasActions } from "./canvas-actions.js";
import { canvasCommands } from "./canvas-commands.js";
import { PRESETS } from "./deps.js";
import type { CanvasSource, ZoomKey } from "./deps.js";
import { useCommands } from "./registry.js";

interface CanvasInput {
  check: { checking: boolean; run: () => void };
  comment: {
    available: boolean;
    on: boolean;
    setOn: (on: boolean) => void;
    toggle: () => void;
  };
  dark: { dark: boolean; onToggle: () => void } | undefined;
  draw: { available: boolean; on: boolean; toggle: () => void };
  hasHead: boolean;
  layersOpen: boolean;
  live: boolean;
  lofi?: { on: boolean; onToggle: () => void } | undefined;
  onLayers: () => void;
  onSource: (source: CanvasSource) => void;
  play: () => void;
  selectMode: boolean;
  setSelectMode: (update: (on: boolean) => boolean) => void;
  zoomBy: (key: ZoomKey, from: "menu") => void;
}

const toDark = (canvasInput: CanvasInput): CanvasActions["dark"] => {
  if (canvasInput.dark) {
    return { on: canvasInput.dark.dark, toggle: canvasInput.dark.onToggle };
  }

  return null;
};

const toLofi = (canvasInput: CanvasInput): CanvasActions["lofi"] => {
  if (canvasInput.lofi) {
    return { on: canvasInput.lofi.on, toggle: canvasInput.lofi.onToggle };
  }

  return null;
};

const toDraw = (canvasInput: CanvasInput): CanvasActions["draw"] => {
  if (canvasInput.draw.available) {
    return canvasInput.draw;
  }

  return null;
};

const actionsOf = (canvasInput: CanvasInput): CanvasActions => ({
  checking: canvasInput.check.checking,
  comment: canvasInput.comment,
  dark: toDark(canvasInput),
  draw: toDraw(canvasInput),
  hasHead: canvasInput.hasHead,
  layersOpen: canvasInput.layersOpen,
  live: canvasInput.live,
  lofi: toLofi(canvasInput),
  onCheck: canvasInput.check.run,
  onLayers: canvasInput.onLayers,
  onSelect: () => {
    canvasInput.comment.setOn(false);
    canvasInput.setSelectMode((match) => !match);
  },
  onSource: (kind) => canvasInput.onSource({ kind }),
  play: canvasInput.play,
  presets: PRESETS,
  selectMode: canvasInput.selectMode,
  zoom: (key) => canvasInput.zoomBy(key, "menu"),
});

const useCanvasCommands = (input: CanvasInput): void => {
  const latest = useRef(input);

  useEffect(() => {
    latest.current = input;
  }, [input]);
  useCommands(() => canvasCommands(actionsOf(latest.current)));
};

export { useCanvasCommands };

export type { CanvasActions, CanvasInput };
