import type { CanvasActions } from "./canvas-actions.js";
import { toReason, toTitle, withDisabled } from "./command-disabled.js";
import { animationTimeline, uiStore } from "./deps.js";
import type { KeyId, ZoomKey } from "./deps.js";
import type { Command } from "./registry.js";

const ZOOMS: { key: ZoomKey; keyId: KeyId; keywords: string; title: string }[] =
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

const zoomCommands = (canvasActions: CanvasActions): Command[] =>
  ZOOMS.map((zed) => ({
    group: "Canvas",
    icon: "search" as const,
    id: `view.zoom-${zed.key}`,
    keyId: zed.keyId,
    keywords: zed.keywords,
    run: () => canvasActions.zoom(zed.key),
    title: zed.title,
  }));

const viewCommands = (canvasActions: CanvasActions): Command[] => [
  {
    group: "View",
    icon: "radio",
    id: "view.live",
    keywords: "source current",
    run: () => canvasActions.onSource("live"),
    title: "Show the live preview",
  },
  withDisabled(
    {
      group: "View",
      icon: "history",
      id: "view.last",
      keywords: "source previous",
      run: () => canvasActions.onSource("last"),
      title: "Show the last completed version",
    },
    toReason(!canvasActions.hasHead, "No version yet")
  ),
  ...canvasActions.presets.map((viewportPreset): Command => ({
    group: "View",
    icon: viewportPreset.id as Command["icon"],
    id: `view.viewport-${viewportPreset.id}`,
    keywords: "viewport size device breakpoint",
    run: () =>
      uiStore.set({
        viewport: {
          height: viewportPreset.height,
          preset: viewportPreset.id,
          width: viewportPreset.width,
        },
      }),
    title: `Preview at ${viewportPreset.label}`,
  })),
];

const sectionCommands = (canvasActions: CanvasActions): Command[] => [
  {
    group: "View",
    icon: "layers",
    id: "view.add-section",
    keywords: "group frames section container",
    run: canvasActions.addSection,
    title: "Add section around selected frames",
  },
];

const playCommands = (canvasActions: CanvasActions): Command[] => [
  {
    group: "Canvas",
    icon: "pointer",
    id: "tool.select",
    keyId: "tool-select",
    keywords: "pick inspect edit",
    run: canvasActions.onSelect,
    title: toTitle(
      canvasActions.selectMode,
      "Stop selecting",
      "Select elements"
    ),
  },
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
    icon: "play",
    id: "view.animation",
    keywords: "timeline keyframes motion animate",
    run: () => animationTimeline.set(!animationTimeline.get()),
    title: "Show or hide the animation timeline",
  },
  withDisabled(
    {
      group: "Canvas",
      icon: "scan",
      id: "canvas.check",
      keywords: "accessibility errors overflow",
      run: canvasActions.onCheck,
      title: "Check render",
    },
    toReason(canvasActions.checking, "Checking now")
  ),
];

const toolCommands = (canvasActions: CanvasActions): Command[] => {
  const out: Command[] = [];
  const { comment, dark, draw, lofi } = canvasActions;

  if (comment.available) {
    out.push({
      group: "Canvas",
      icon: "comment",
      id: "tool.comment",
      keyId: "tool-comment",
      keywords: "pin feedback note",
      run: comment.toggle,
      title: toTitle(comment.on, "Stop commenting", "Add comments"),
    });
  }

  if (draw) {
    out.push({
      group: "Canvas",
      icon: "pencil",
      id: "tool.draw",
      keyId: "tool-draw",
      keywords: "pen sketch stroke",
      run: draw.toggle,
      title: toTitle(draw.on, "Stop drawing", "Draw on the design"),
    });
  }

  if (lofi) {
    out.push({
      group: "View",
      icon: "pencil",
      id: "view.lofi",
      keywords: "wireframe grayscale sketch hand drawn",
      run: lofi.toggle,
      title: toTitle(
        lofi.on,
        "Turn off the lo-fi look",
        "Turn on the lo-fi look"
      ),
    });
  }

  out.push({
    group: "View",
    icon: "layers",
    id: "view.outline",
    keyId: "view-outline",
    keywords: "wireframe boxes borders outline mode",
    run: canvasActions.outline.toggle,
    title: toTitle(
      canvasActions.outline.on,
      "Hide layer outlines",
      "Show layer outlines"
    ),
  });

  if (dark) {
    out.push({
      group: "View",
      icon: "moon",
      id: "view.dark",
      keywords: "theme light",
      run: dark.toggle,
      title: toTitle(dark.on, "Preview the default mode", "Preview dark mode"),
    });
  }

  return out;
};

const canvasCommands = (canvasActions: CanvasActions): Command[] => [
  ...zoomCommands(canvasActions),
  ...viewCommands(canvasActions),
  ...sectionCommands(canvasActions),
  ...playCommands(canvasActions),
  ...toolCommands(canvasActions),
];

export { canvasCommands };
