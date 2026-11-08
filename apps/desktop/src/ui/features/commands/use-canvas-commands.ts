import { useRef } from "react";

import { PRESETS, uiStore } from "./deps.js";
import type { CanvasSource, KeyId, ViewportPreset, ZoomKey } from "./deps.js";
import { useCommands } from "./registry.js";
import type { Command } from "./registry.js";

interface CanvasActions {
  live: boolean;
  hasHead: boolean;
  zoom: (key: ZoomKey) => void;
  selectMode: boolean;
  onSelect: () => void;
  comment: { available: boolean; on: boolean; toggle: () => void };
  draw: { on: boolean; toggle: () => void } | null;
  layersOpen: boolean;
  onLayers: () => void;
  onSource: (kind: "live" | "last") => void;
  dark: { on: boolean; toggle: () => void } | null;
  lofi: { on: boolean; toggle: () => void } | null;
  onCheck: () => void;
  checking: boolean;
  presets: readonly ViewportPreset[];
  play: () => void;
}

const ZOOMS: { key: ZoomKey; title: string; keyId: KeyId; keywords: string }[] =
  [
    {
      key: "fit",
      keyId: "zoom-fit",
      keywords: "view whole",
      title: "Zoom to fit",
    },
    {
      key: "selection",
      keyId: "zoom-selection",
      keywords: "view element",
      title: "Zoom to selection",
    },
    {
      key: "actual",
      keyId: "zoom-actual",
      keywords: "actual size reset",
      title: "Zoom to 100%",
    },
    {
      key: "in",
      keyId: "zoom-in",
      keywords: "bigger larger",
      title: "Zoom in",
    },
    { key: "out", keyId: "zoom-out", keywords: "smaller", title: "Zoom out" },
  ];

const canvasCommands = (canvasActions: CanvasActions): Command[] => {
  const needLive = canvasActions.live
    ? {}
    : { disabled: "Only in the live preview" };

  const out: Command[] = [
    ...ZOOMS.map((zed) => ({
      group: "Canvas",
      icon: "search" as const,
      id: `view.zoom-${zed.key}`,
      keyId: zed.keyId,
      keywords: zed.keywords,
      run: () => canvasActions.zoom(zed.key),
      title: zed.title,
    })),
    {
      group: "Canvas",
      icon: "pointer",
      id: "tool.select",
      keyId: "tool-select",
      keywords: "pick inspect edit",
      run: canvasActions.onSelect,
      title: canvasActions.selectMode ? "Stop selecting" : "Select elements",
    },
    {
      group: "View",
      icon: "layers",
      id: "view.layers",
      keyId: "layers",
      keywords: "tree outline dom inspector edit",
      run: canvasActions.onLayers,
      title: canvasActions.layersOpen
        ? "Leave edit mode"
        : "Edit and show layers",
      ...needLive,
    },
    {
      group: "View",
      icon: "radio",
      id: "view.live",
      keywords: "source current",
      run: () => canvasActions.onSource("live"),
      title: "Show the live preview",
    },
    {
      group: "View",
      icon: "history",
      id: "view.last",
      keywords: "source previous",
      run: () => canvasActions.onSource("last"),
      title: "Show the last completed version",
      ...(canvasActions.hasHead ? {} : { disabled: "No version yet" }),
    },
    ...canvasActions.presets.map((viewportPreset) => ({
      group: "View",
      icon: viewportPreset.id as Command["icon"],
      id: `view.viewport-${viewportPreset.id}`,
      keywords: "viewport size device breakpoint",
      run: () =>
        uiStore.set({
          viewport: {
            preset: viewportPreset.id,
            width: viewportPreset.width,
            height: viewportPreset.height,
          },
        }),
      title: `Preview at ${viewportPreset.label}`,
    })),
    {
      group: "Canvas",
      icon: "play",
      id: "present.play",
      keywords: "present prototype links click through",
      run: canvasActions.play,
      title: "Play prototype",
    },
    {
      group: "Canvas",
      icon: "scan",
      id: "canvas.check",
      keywords: "accessibility errors overflow",
      run: canvasActions.onCheck,
      title: "Check render",
      ...(canvasActions.checking ? { disabled: "Checking now" } : {}),
    },
  ];

  if (canvasActions.comment.available) {
    out.push({
      group: "Canvas",
      icon: "comment",
      id: "tool.comment",
      keyId: "tool-comment",
      keywords: "pin feedback note",
      run: canvasActions.comment.toggle,
      title: canvasActions.comment.on ? "Stop commenting" : "Add comments",
    });
  }

  if (canvasActions.draw) {
    out.push({
      group: "Canvas",
      icon: "pencil",
      id: "tool.draw",
      keyId: "tool-draw",
      keywords: "pen sketch stroke",
      run: canvasActions.draw.toggle,
      title: canvasActions.draw.on ? "Stop drawing" : "Draw on the design",
    });
  }

  if (canvasActions.lofi) {
    out.push({
      group: "View",
      icon: "pencil",
      id: "view.lofi",
      keywords: "wireframe grayscale sketch hand drawn",
      run: canvasActions.lofi.toggle,
      title: canvasActions.lofi.on
        ? "Turn off the lo-fi look"
        : "Turn on the lo-fi look",
    });
  }

  if (canvasActions.dark) {
    out.push({
      group: "View",
      icon: "moon",
      id: "view.dark",
      keywords: "theme light",
      run: canvasActions.dark.toggle,
      title: canvasActions.dark.on
        ? "Preview the default mode"
        : "Preview dark mode",
    });
  }

  return out;
};

interface CanvasInput {
  live: boolean;
  hasHead: boolean;
  zoomBy: (key: ZoomKey, from: "menu") => void;
  selectMode: boolean;
  setSelectMode: (update: (on: boolean) => boolean) => void;
  comment: {
    available: boolean;
    on: boolean;
    toggle: () => void;
    setOn: (on: boolean) => void;
  };
  draw: { available: boolean; on: boolean; toggle: () => void };
  layersOpen: boolean;
  onLayers: () => void;
  onSource: (source: CanvasSource) => void;
  dark: { dark: boolean; onToggle: () => void } | undefined;
  lofi?: { on: boolean; onToggle: () => void } | undefined;
  check: { run: () => void; checking: boolean };
  play: () => void;
}

const actionsOf = (canvasInput: CanvasInput): CanvasActions => ({
  checking: canvasInput.check.checking,
  comment: canvasInput.comment,
  dark: canvasInput.dark
    ? { on: canvasInput.dark.dark, toggle: canvasInput.dark.onToggle }
    : null,
  draw: canvasInput.draw.available ? canvasInput.draw : null,
  hasHead: canvasInput.hasHead,
  layersOpen: canvasInput.layersOpen,
  live: canvasInput.live,
  lofi: canvasInput.lofi
    ? { on: canvasInput.lofi.on, toggle: canvasInput.lofi.onToggle }
    : null,
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
  latest.current = input;
  useCommands(() => canvasCommands(actionsOf(latest.current)));
};

export { useCanvasCommands };

export type { CanvasActions, CanvasInput };
