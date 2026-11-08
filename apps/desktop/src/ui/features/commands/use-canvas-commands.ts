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

function canvasCommands(a: CanvasActions): Command[] {
  const needLive = a.live ? {} : { disabled: "Only in the live preview" };

  const out: Command[] = [
    ...ZOOMS.map((z) => ({
      group: "Canvas",
      icon: "search" as const,
      id: `view.zoom-${z.key}`,
      keyId: z.keyId,
      keywords: z.keywords,
      run: () => a.zoom(z.key),
      title: z.title,
    })),
    {
      group: "Canvas",
      icon: "pointer",
      id: "tool.select",
      keyId: "tool-select",
      keywords: "pick inspect edit",
      run: a.onSelect,
      title: a.selectMode ? "Stop selecting" : "Select elements",
    },
    {
      group: "View",
      icon: "layers",
      id: "view.layers",
      keyId: "layers",
      keywords: "tree outline dom inspector edit",
      run: a.onLayers,
      title: a.layersOpen ? "Leave edit mode" : "Edit and show layers",
      ...needLive,
    },
    {
      group: "View",
      icon: "radio",
      id: "view.live",
      keywords: "source current",
      run: () => a.onSource("live"),
      title: "Show the live preview",
    },
    {
      group: "View",
      icon: "history",
      id: "view.last",
      keywords: "source previous",
      run: () => a.onSource("last"),
      title: "Show the last completed version",
      ...(a.hasHead ? {} : { disabled: "No version yet" }),
    },
    ...a.presets.map((p) => ({
      group: "View",
      icon: p.id as Command["icon"],
      id: `view.viewport-${p.id}`,
      keywords: "viewport size device breakpoint",
      run: () =>
        uiStore.set({
          viewport: { preset: p.id, width: p.width, height: p.height },
        }),
      title: `Preview at ${p.label}`,
    })),
    {
      group: "Canvas",
      icon: "play",
      id: "present.play",
      keywords: "present prototype links click through",
      run: a.play,
      title: "Play prototype",
    },
    {
      group: "Canvas",
      icon: "scan",
      id: "canvas.check",
      keywords: "accessibility errors overflow",
      run: a.onCheck,
      title: "Check render",
      ...(a.checking ? { disabled: "Checking now" } : {}),
    },
  ];

  if (a.comment.available) {
    out.push({
      group: "Canvas",
      icon: "comment",
      id: "tool.comment",
      keyId: "tool-comment",
      keywords: "pin feedback note",
      run: a.comment.toggle,
      title: a.comment.on ? "Stop commenting" : "Add comments",
    });
  }

  if (a.draw) {
    out.push({
      group: "Canvas",
      icon: "pencil",
      id: "tool.draw",
      keyId: "tool-draw",
      keywords: "pen sketch stroke",
      run: a.draw.toggle,
      title: a.draw.on ? "Stop drawing" : "Draw on the design",
    });
  }

  if (a.lofi) {
    out.push({
      group: "View",
      icon: "pencil",
      id: "view.lofi",
      keywords: "wireframe grayscale sketch hand drawn",
      run: a.lofi.toggle,
      title: a.lofi.on ? "Turn off the lo-fi look" : "Turn on the lo-fi look",
    });
  }

  if (a.dark) {
    out.push({
      group: "View",
      icon: "moon",
      id: "view.dark",
      keywords: "theme light",
      run: a.dark.toggle,
      title: a.dark.on ? "Preview the default mode" : "Preview dark mode",
    });
  }

  return out;
}

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

function actionsOf(i: CanvasInput): CanvasActions {
  return {
    checking: i.check.checking,
    comment: i.comment,
    dark: i.dark ? { on: i.dark.dark, toggle: i.dark.onToggle } : null,
    draw: i.draw.available ? i.draw : null,
    hasHead: i.hasHead,
    layersOpen: i.layersOpen,
    live: i.live,
    lofi: i.lofi ? { on: i.lofi.on, toggle: i.lofi.onToggle } : null,
    onCheck: i.check.run,
    onLayers: i.onLayers,
    onSelect: () => {
      i.comment.setOn(false);
      i.setSelectMode((m) => !m);
    },
    onSource: (kind) => i.onSource({ kind }),
    play: i.play,
    presets: PRESETS,
    selectMode: i.selectMode,
    zoom: (key) => i.zoomBy(key, "menu"),
  };
}

function useCanvasCommands(input: CanvasInput): void {
  const latest = useRef(input);
  latest.current = input;
  useCommands(() => canvasCommands(actionsOf(latest.current)));
}

export { useCanvasCommands };

export type { CanvasActions, CanvasInput };
