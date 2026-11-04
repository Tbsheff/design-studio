import type { OxlintOverride } from "oxlint";

type Severity = "error" | "warn";

type ElementSelector = {
  type: string | string[];
  captured?: Record<string, string>;
};

type Policy = {
  from: { element: ElementSelector };
  allow: { to: { element: ElementSelector } }[];
};

type Element = {
  type: string;
  pattern: string;
  partialMatch?: boolean;
  capture?: string[];
};

const element = (
  type: string,
  pattern: string,
  capture?: string[]
): Element => ({
  type,
  pattern,
  partialMatch: false,
  ...(capture ? { capture } : {}),
});

export const ELEMENTS: Element[] = [
  element("shared-contract", "src/shared/contract"),
  element("shared", "src/shared"),
  element("bridge", "src/bridge"),
  element("platform", "src/server/platform/*", ["mod"]),
  element("handlers", "src/server/handlers/*", ["domain"]),
  element("agent", "src/server/agent"),
  element("adapter", "src/server/http"),
  element("adapter", "src/server/mcp"),
  element("agent-kit", "src/server/agent-tools"),
  element("main", "src/server/main"),
  element("domain", "src/server/*", ["area"]),
  element("server", "src/server"),
  element("ui-kit", "src/ui/ai"),
  element("ui-domain", "src/ui/domain"),
  element("ui-platform", "src/ui/platform"),
  element("ui-feature", "src/ui/features/*", ["feature"]),
  element("ui", "src/ui"),
  element("desktop", "desktop"),
  element("cloud-publish", "apps/publish"),
  element("cloud-api", "apps/api"),
  element("tooling", "scripts"),
  element("tooling", "e2e"),
  element("tooling", "lint"),
];

const UI_CROSS_FEATURE_FILES = [
  "src/ui/features/accessibility/deps.ts",
  "src/ui/features/canvas/canvas-helpers.ts",
  "src/ui/features/canvas/canvas-layers.tsx",
  "src/ui/features/canvas/canvas-stage.tsx",
  "src/ui/features/canvas/canvas-tool-slots.tsx",
  "src/ui/features/canvas/canvas-types.ts",
  "src/ui/features/canvas/canvas-view.tsx",
  "src/ui/features/canvas/canvas.tsx",
  "src/ui/features/canvas/draw-layer.tsx",
  "src/ui/features/canvas/frame-more-menu.tsx",
  "src/ui/features/canvas/frame-skeleton.tsx",
  "src/ui/features/canvas/passive-frame.tsx",
  "src/ui/features/canvas/stage-parts.tsx",
  "src/ui/features/canvas/top-bar-drop-menu.tsx",
  "src/ui/features/canvas/use-canvas-edits.ts",
  "src/ui/features/canvas/use-canvas-frames.ts",
  "src/ui/features/canvas/use-canvas-presence.ts",
  "src/ui/features/canvas/use-canvas-preview.ts",
  "src/ui/features/canvas/use-canvas-stage.ts",
  "src/ui/features/canvas/use-direction-frames.ts",
  "src/ui/features/canvas/use-free-move.ts",
  "src/ui/features/canvas/use-preview-frames.ts",
  "src/ui/features/canvas/use-preview-menu.tsx",
  "src/ui/features/canvas/use-preview-url.ts",
  "src/ui/features/canvas/use-resize-handles.ts",
  "src/ui/features/canvas/variations-control.tsx",
  "src/ui/features/canvas/variations-layer.tsx",
  "src/ui/features/chat/draft-bar.tsx",
  "src/ui/features/chat/mcp-point-badge.tsx",
  "src/ui/features/chat/prompt-box.tsx",
  "src/ui/features/chat/run-comments.tsx",
  "src/ui/features/chat/run-settings.tsx",
  "src/ui/features/chat/use-first-build.ts",
  "src/ui/features/chat/use-inline-prompt.ts",
  "src/ui/features/chat/use-run-canvas.ts",
  "src/ui/features/commands/deps.ts",
  "src/ui/features/comments/deps.ts",
  "src/ui/features/component-variant/deps.ts",
  "src/ui/features/design-system/component-insert.tsx",
  "src/ui/features/design-system/design-md-modal.tsx",
  "src/ui/features/design-system/design-system-chip.tsx",
  "src/ui/features/design-system/design-systems.tsx",
  "src/ui/features/design-system/pack-list.tsx",
  "src/ui/features/design-system/pack-picker.tsx",
  "src/ui/features/design-system/port-to-app-dialog.tsx",
  "src/ui/features/design-system/use-component-insert.ts",
  "src/ui/features/design-system/use-components.ts",
  "src/ui/features/design-system/use-design-system-state.ts",
  "src/ui/features/fill/deps.ts",
  "src/ui/features/home/composer-bar.tsx",
  "src/ui/features/home/home-extras.tsx",
  "src/ui/features/home/home-model.ts",
  "src/ui/features/home/home-popovers.tsx",
  "src/ui/features/home/home-slash.tsx",
  "src/ui/features/home/lazy-parts.ts",
  "src/ui/features/home/library-panel.tsx",
  "src/ui/features/home/new-project-advanced.tsx",
  "src/ui/features/home/pill-select.tsx",
  "src/ui/features/home/project-grid.tsx",
  "src/ui/features/home/project-rail.tsx",
  "src/ui/features/home/use-home-screen.tsx",
  "src/ui/features/home/use-studio-data.ts",
  "src/ui/features/icons/deps.ts",
  "src/ui/features/image-generate/deps.ts",
  "src/ui/features/image-search/deps.ts",
  "src/ui/features/inspector/arrange-model.ts",
  "src/ui/features/inspector/box-model.tsx",
  "src/ui/features/inspector/delta-batch.ts",
  "src/ui/features/inspector/deps.ts",
  "src/ui/features/inspector/element-variants-dialog.tsx",
  "src/ui/features/inspector/inspector-code.tsx",
  "src/ui/features/inspector/inspector-fields.tsx",
  "src/ui/features/inspector/inspector-model.ts",
  "src/ui/features/inspector/inspector-multi.tsx",
  "src/ui/features/inspector/inspector-props.tsx",
  "src/ui/features/inspector/inspector-simple.tsx",
  "src/ui/features/inspector/inspector-tokens.tsx",
  "src/ui/features/inspector/inspector-tools.tsx",
  "src/ui/features/inspector/inspector-vector.tsx",
  "src/ui/features/inspector/layout-keys.ts",
  "src/ui/features/inspector/match-scan.ts",
  "src/ui/features/inspector/number-field.tsx",
  "src/ui/features/inspector/paste-jsx.ts",
  "src/ui/features/inspector/size-row.tsx",
  "src/ui/features/inspector/structure-edits.ts",
  "src/ui/features/inspector/swap-instance-menu.tsx",
  "src/ui/features/inspector/tweaks-panel.tsx",
  "src/ui/features/inspector/use-arrange.ts",
  "src/ui/features/inspector/use-edit-history.ts",
  "src/ui/features/inspector/use-element-nudge.ts",
  "src/ui/features/inspector/use-planned-edits.ts",
  "src/ui/features/inspector/use-swap-gate.ts",
  "src/ui/features/inspector/use-token-snap.ts",
  "src/ui/features/inspector/use-tweaks.ts",
  "src/ui/features/link-interaction/deps.ts",
  "src/ui/features/motion/deps.ts",
  "src/ui/features/page-import/deps.ts",
  "src/ui/features/review/errors-panel.tsx",
  "src/ui/features/review/review-entry.tsx",
  "src/ui/features/review/review-panel.tsx",
  "src/ui/features/review/rules-editor.tsx",
  "src/ui/features/review/use-review.ts",
  "src/ui/features/share-publish-ship-export/export-api.ts",
  "src/ui/features/share-publish-ship-export/export-dialog.tsx",
  "src/ui/features/share-publish-ship-export/publish-pane.tsx",
  "src/ui/features/share-publish-ship-export/share-dialog.tsx",
  "src/ui/features/share-publish-ship-export/share-live.ts",
  "src/ui/features/spacing/deps.ts",
  "src/ui/features/stacking/deps.ts",
  "src/ui/features/state-styles/deps.ts",
  "src/ui/features/text-search/deps.ts",
  "src/ui/features/text-styles/deps.ts",
  "src/ui/features/token-sweep/deps.ts",
  "src/ui/features/versions-layers-tokens/compare-frame.tsx",
  "src/ui/features/versions-layers-tokens/create-token-dialog.tsx",
  "src/ui/features/versions-layers-tokens/deps.ts",
  "src/ui/features/versions-layers-tokens/layers-panel.tsx",
  "src/ui/features/versions-layers-tokens/token-control.tsx",
  "src/ui/features/versions-layers-tokens/token-draft.ts",
  "src/ui/features/versions-layers-tokens/token-inputs.tsx",
  "src/ui/features/versions-layers-tokens/token-lint.test.ts",
  "src/ui/features/versions-layers-tokens/token-lint.ts",
  "src/ui/features/versions-layers-tokens/tokens-panel.tsx",
  "src/ui/features/versions-layers-tokens/use-layer-edits.ts",
  "src/ui/features/versions-layers-tokens/use-studio-tokens.ts",
  "src/ui/features/versions-layers-tokens/use-token-draft.ts",
  "src/ui/features/versions-layers-tokens/version-row.tsx",
];

const SERVER_TYPES = [
  "platform",
  "domain",
  "handlers",
  "agent-kit",
  "agent",
  "adapter",
  "main",
  "server",
];

const allow = (from: ElementSelector, to: ElementSelector[]): Policy => ({
  from: { element: from },
  allow: to.map((target) => ({ to: { element: target } })),
});

export const ROOT_POLICIES: Policy[] = [
  allow({ type: "shared*" }, [{ type: "shared*" }]),
  allow({ type: "bridge" }, [{ type: ["shared", "shared-contract"] }]),
  allow({ type: "ui*" }, [{ type: ["shared", "shared-contract", "ui*"] }]),
  allow({ type: SERVER_TYPES }, [
    { type: ["shared", "shared-contract", "cloud-publish", ...SERVER_TYPES] },
  ]),
  allow({ type: "desktop" }, [
    { type: ["shared", "shared-contract", "desktop"] },
    { type: "platform", captured: { mod: "data-lock" } },
    { type: "platform", captured: { mod: "bridge-build" } },
  ]),
  allow({ type: "cloud-publish" }, [{ type: ["cloud-publish", "shared"] }]),
  allow({ type: "cloud-api" }, [
    { type: ["shared", "shared-contract", "cloud-api"] },
  ]),
  allow({ type: "tooling" }, [
    { type: ["shared", "shared-contract", "main", "desktop", "tooling"] },
  ]),
];

export const dependencies = (
  severity: Severity,
  policies: Policy[]
): [Severity, { default: string; policies: Policy[] }] => [
  severity,
  { default: "disallow", policies },
];

type Layer = {
  name: string;
  areas?: string[];
  type?: string;
  paths?: string[];
};

export const LAYERS: Layer[] = [
  { name: "platform", type: "platform", paths: ["src/server/platform"] },
  { name: "events", areas: ["events"] },
  { name: "store", areas: ["store", "run-log"] },
  { name: "app-runtime", areas: ["app", "project-source"] },
  { name: "ds-model", areas: ["design-system"] },
  { name: "edit-engine", areas: ["direct-edit"] },
  { name: "component-model", areas: ["components"] },
  { name: "preview", areas: ["preview"] },
  { name: "page-probe", areas: ["page-probe", "layers"] },
  { name: "canvas-core", areas: ["canvas"] },
  {
    name: "app-flow",
    areas: [
      "export",
      "review",
      "tweaks",
      "figma",
      "design-rules",
      "comments",
      "content",
      "viewport",
      "image-generate",
      "token-sweep",
      "gallery",
      "state-styles",
      "breakpoints",
      "style-scope",
      "icons",
      "mcp-life",
    ],
  },
  {
    name: "share",
    areas: [
      "share",
      "publish",
      "ship",
      "variations",
      "git",
      "cloud",
      "project-ops",
    ],
  },
  { name: "handlers", type: "handlers", paths: ["src/server/handlers"] },
  { name: "agent-kit", type: "agent-kit", paths: ["src/server/agent-tools"] },
  { name: "agent", type: "agent", paths: ["src/server/agent"] },
  {
    name: "adapter",
    type: "adapter",
    paths: ["src/server/http", "src/server/mcp"],
  },
  { name: "main", type: "main", paths: ["src/server/main"] },
];

const selectorsOf = (layer: Layer): ElementSelector[] =>
  layer.areas
    ? layer.areas.map((area) => ({ type: "domain", captured: { area } }))
    : [{ type: layer.type ?? "server" }];

export const globsOf = (layer: Layer): string[] =>
  (layer.areas
    ? layer.areas.map((area) => `src/server/${area}`)
    : (layer.paths ?? [])
  ).map((dir) => `${dir}/**`);

export const layerPolicies = (index: number): Policy[] => {
  const layer = LAYERS[index];
  if (!layer) {
    return [];
  }
  const lower = LAYERS.slice(0, index).flatMap(selectorsOf);
  const own = layer.name === "adapter" ? [] : selectorsOf(layer);
  return [
    allow({ type: "*" }, [
      { type: ["shared", "shared-contract", "cloud-publish"] },
      ...lower,
      ...own,
    ]),
  ];
};

export const layerOverride = (
  index: number,
  files: string[],
  severity: Severity
): OxlintOverride => ({
  files,
  rules: {
    "boundaries/dependencies": dependencies(severity, layerPolicies(index)),
  },
});

export const UI_GLOBALS = [
  "fetch",
  "localStorage",
  "sessionStorage",
  "EventSource",
  "BroadcastChannel",
].map((name) => ({
  name,
  message:
    "Browser I/O outside src/ui/platform is banned. Use the helpers from src/ui/platform.",
}));

export const STUDIO_DESKTOP = [
  {
    object: "window",
    property: "studioDesktop",
    message:
      "window.studioDesktop outside src/ui/platform is banned. Use the desktop helpers from src/ui/platform.",
  },
];

export const SHARED_DOM = ["document", "window"].map((name) => ({
  name,
  message:
    "DOM globals in src/shared are banned. Use values passed in from src/ui.",
}));

export const UI_IO_OVERRIDES: OxlintOverride[] = [
  {
    files: ["src/ui/**"],
    rules: {
      "no-restricted-globals": ["error", ...UI_GLOBALS],
      "no-restricted-properties": ["error", ...STUDIO_DESKTOP],
    },
  },
  {
    files: ["src/ui/platform/**"],
    rules: {
      "no-restricted-globals": "off",
      "no-restricted-properties": "off",
    },
  },
];

export const UI_CROSS_FEATURE_OVERRIDES: OxlintOverride[] = [
  {
    files: UI_CROSS_FEATURE_FILES,
    rules: { "boundaries/dependencies": dependencies("warn", ROOT_POLICIES) },
  },
];
