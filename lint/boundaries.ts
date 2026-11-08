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
  partialMatch: false,
  pattern,
  type,
  ...(capture ? { capture } : {}),
});

export const ELEMENTS: Element[] = [
  element("shared", "apps/desktop/src/shared"),
  element("bridge", "apps/desktop/src/bridge"),
  element("platform", "apps/desktop/src/server/platform/*", ["mod"]),
  element("handlers", "apps/desktop/src/server/handlers/*", ["domain"]),
  element("agent", "apps/desktop/src/server/agent"),
  element("adapter", "apps/desktop/src/server/http"),
  element("adapter", "apps/desktop/src/server/mcp"),
  element("agent-kit", "apps/desktop/src/server/agent-tools"),
  element("main", "apps/desktop/src/server/main"),
  element("domain", "apps/desktop/src/server/*", ["area"]),
  element("server", "apps/desktop/src/server"),
  element("ui-kit", "apps/desktop/src/ui/ai"),
  element("ui-domain", "apps/desktop/src/ui/domain"),
  element("ui-platform", "apps/desktop/src/ui/platform"),
  element("ui-feature", "apps/desktop/src/ui/features/*", ["feature"]),
  element("ui", "apps/desktop/src/ui"),
  element("desktop", "apps/desktop/desktop"),
  element("package-contracts", "packages/common/contracts"),
  element("package-actions", "packages/common/actions"),
  element("package-ui", "packages/ui"),
  element("cloud-publish", "apps/publish"),
  element("cloud-api", "apps/api"),
  element("tooling", "apps/desktop/scripts"),
  element("tooling", "apps/desktop/e2e"),
  element("tooling", "lint"),
];

const UI_CROSS_FEATURE_FILES = [
  "apps/desktop/src/ui/features/accessibility/deps.ts",
  "apps/desktop/src/ui/features/canvas/canvas-helpers.ts",
  "apps/desktop/src/ui/features/canvas/canvas-layers.tsx",
  "apps/desktop/src/ui/features/canvas/canvas-stage.tsx",
  "apps/desktop/src/ui/features/canvas/canvas-tool-slots.tsx",
  "apps/desktop/src/ui/features/canvas/canvas-types.ts",
  "apps/desktop/src/ui/features/canvas/canvas-view.tsx",
  "apps/desktop/src/ui/features/canvas/canvas.tsx",
  "apps/desktop/src/ui/features/canvas/draw-layer.tsx",
  "apps/desktop/src/ui/features/canvas/frame-more-menu.tsx",
  "apps/desktop/src/ui/features/canvas/frame-skeleton.tsx",
  "apps/desktop/src/ui/features/canvas/passive-frame.tsx",
  "apps/desktop/src/ui/features/canvas/stage-parts.tsx",
  "apps/desktop/src/ui/features/canvas/top-bar-drop-menu.tsx",
  "apps/desktop/src/ui/features/canvas/use-canvas-edits.ts",
  "apps/desktop/src/ui/features/canvas/use-canvas-frames.ts",
  "apps/desktop/src/ui/features/canvas/use-canvas-presence.ts",
  "apps/desktop/src/ui/features/canvas/use-canvas-preview.ts",
  "apps/desktop/src/ui/features/canvas/use-canvas-stage.ts",
  "apps/desktop/src/ui/features/canvas/use-direction-frames.ts",
  "apps/desktop/src/ui/features/canvas/use-free-move.ts",
  "apps/desktop/src/ui/features/canvas/use-preview-frames.ts",
  "apps/desktop/src/ui/features/canvas/use-preview-menu.tsx",
  "apps/desktop/src/ui/features/canvas/use-preview-url.ts",
  "apps/desktop/src/ui/features/canvas/use-resize-handles.ts",
  "apps/desktop/src/ui/features/canvas/variations-control.tsx",
  "apps/desktop/src/ui/features/canvas/variations-layer.tsx",
  "apps/desktop/src/ui/features/chat/draft-bar.tsx",
  "apps/desktop/src/ui/features/chat/mcp-point-badge.tsx",
  "apps/desktop/src/ui/features/chat/prompt-box.tsx",
  "apps/desktop/src/ui/features/chat/run-comments.tsx",
  "apps/desktop/src/ui/features/chat/run-settings.tsx",
  "apps/desktop/src/ui/features/chat/use-first-build.ts",
  "apps/desktop/src/ui/features/chat/use-inline-prompt.ts",
  "apps/desktop/src/ui/features/chat/use-run-canvas.ts",
  "apps/desktop/src/ui/features/commands/deps.ts",
  "apps/desktop/src/ui/features/comments/deps.ts",
  "apps/desktop/src/ui/features/component-variant/deps.ts",
  "apps/desktop/src/ui/features/design-system/component-insert.tsx",
  "apps/desktop/src/ui/features/design-system/design-md-modal.tsx",
  "apps/desktop/src/ui/features/design-system/design-system-chip.tsx",
  "apps/desktop/src/ui/features/design-system/design-systems.tsx",
  "apps/desktop/src/ui/features/design-system/pack-list.tsx",
  "apps/desktop/src/ui/features/design-system/port-to-app-dialog.tsx",
  "apps/desktop/src/ui/features/design-system/use-component-insert.ts",
  "apps/desktop/src/ui/features/design-system/use-components.ts",
  "apps/desktop/src/ui/features/design-system/use-design-system-state.ts",
  "apps/desktop/src/ui/features/fill/deps.ts",
  "apps/desktop/src/ui/features/home/composer-bar.tsx",
  "apps/desktop/src/ui/features/home/home-extras.tsx",
  "apps/desktop/src/ui/features/home/home-model.ts",
  "apps/desktop/src/ui/features/home/home-popovers.tsx",
  "apps/desktop/src/ui/features/home/home-slash.tsx",
  "apps/desktop/src/ui/features/home/library-panel.tsx",
  "apps/desktop/src/ui/features/home/new-project-advanced.tsx",
  "apps/desktop/src/ui/features/home/pill-select.tsx",
  "apps/desktop/src/ui/features/home/project-grid.tsx",
  "apps/desktop/src/ui/features/home/project-rail.tsx",
  "apps/desktop/src/ui/features/home/use-home-screen.tsx",
  "apps/desktop/src/ui/features/home/use-studio-data.ts",
  "apps/desktop/src/ui/features/icons/deps.ts",
  "apps/desktop/src/ui/features/image-generate/deps.ts",
  "apps/desktop/src/ui/features/image-search/deps.ts",
  "apps/desktop/src/ui/features/inspector/arrange-model.ts",
  "apps/desktop/src/ui/features/inspector/box-model.tsx",
  "apps/desktop/src/ui/features/inspector/deps.ts",
  "apps/desktop/src/ui/features/inspector/element-variants-dialog.tsx",
  "apps/desktop/src/ui/features/inspector/inspector-code.tsx",
  "apps/desktop/src/ui/features/inspector/inspector-fields.tsx",
  "apps/desktop/src/ui/features/inspector/inspector-model.ts",
  "apps/desktop/src/ui/features/inspector/inspector-props.tsx",
  "apps/desktop/src/ui/features/inspector/inspector-simple.tsx",
  "apps/desktop/src/ui/features/inspector/inspector-tools.tsx",
  "apps/desktop/src/ui/features/inspector/inspector-vector.tsx",
  "apps/desktop/src/ui/features/inspector/number-field.tsx",
  "apps/desktop/src/ui/features/inspector/size-row.tsx",
  "apps/desktop/src/ui/features/inspector/swap-instance-menu.tsx",
  "apps/desktop/src/ui/features/inspector/tweaks-panel.tsx",
  "apps/desktop/src/ui/features/inspector/use-arrange.ts",
  "apps/desktop/src/ui/features/inspector/use-edit-history.ts",
  "apps/desktop/src/ui/features/inspector/use-element-nudge.ts",
  "apps/desktop/src/ui/features/inspector/use-planned-edits.ts",
  "apps/desktop/src/ui/features/inspector/use-swap-gate.ts",
  "apps/desktop/src/ui/features/inspector/use-token-snap.ts",
  "apps/desktop/src/ui/features/inspector/use-tweaks.ts",
  "apps/desktop/src/ui/features/link-interaction/deps.ts",
  "apps/desktop/src/ui/features/motion/deps.ts",
  "apps/desktop/src/ui/features/page-import/deps.ts",
  "apps/desktop/src/ui/features/review/errors-panel.tsx",
  "apps/desktop/src/ui/features/review/review-entry.tsx",
  "apps/desktop/src/ui/features/review/review-panel.tsx",
  "apps/desktop/src/ui/features/review/rules-editor.tsx",
  "apps/desktop/src/ui/features/review/use-review.ts",
  "apps/desktop/src/ui/features/share-publish-ship-export/export-api.ts",
  "apps/desktop/src/ui/features/share-publish-ship-export/export-dialog.tsx",
  "apps/desktop/src/ui/features/share-publish-ship-export/publish-pane.tsx",
  "apps/desktop/src/ui/features/share-publish-ship-export/share-dialog.tsx",
  "apps/desktop/src/ui/features/share-publish-ship-export/share-live.ts",
  "apps/desktop/src/ui/features/spacing/deps.ts",
  "apps/desktop/src/ui/features/stacking/deps.ts",
  "apps/desktop/src/ui/features/state-styles/deps.ts",
  "apps/desktop/src/ui/features/text-search/deps.ts",
  "apps/desktop/src/ui/features/text-styles/deps.ts",
  "apps/desktop/src/ui/features/token-sweep/deps.ts",
  "apps/desktop/src/ui/features/versions-layers-tokens/compare-frame.tsx",
  "apps/desktop/src/ui/features/versions-layers-tokens/create-token-dialog.tsx",
  "apps/desktop/src/ui/features/versions-layers-tokens/layers-panel.tsx",
  "apps/desktop/src/ui/features/versions-layers-tokens/token-control.tsx",
  "apps/desktop/src/ui/features/versions-layers-tokens/token-draft.ts",
  "apps/desktop/src/ui/features/versions-layers-tokens/token-inputs.tsx",
  "apps/desktop/src/ui/features/versions-layers-tokens/token-lint.test.ts",
  "apps/desktop/src/ui/features/versions-layers-tokens/token-lint.ts",
  "apps/desktop/src/ui/features/versions-layers-tokens/tokens-panel.tsx",
  "apps/desktop/src/ui/features/versions-layers-tokens/use-layer-edits.ts",
  "apps/desktop/src/ui/features/versions-layers-tokens/use-studio-tokens.ts",
  "apps/desktop/src/ui/features/versions-layers-tokens/use-token-draft.ts",
  "apps/desktop/src/ui/features/versions-layers-tokens/version-row.tsx",
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
  allow: to.map((target) => ({ to: { element: target } })),
  from: { element: from },
});

const PACKAGE_TYPES = ["package-actions", "package-contracts"];

export const ROOT_POLICIES: Policy[] = [
  allow({ type: "package-contracts" }, [{ type: "package-contracts" }]),
  allow({ type: "package-actions" }, [
    { type: ["package-actions", "package-contracts"] },
  ]),
  allow({ type: "package-ui" }, [{ type: "package-ui" }]),
  allow({ type: "shared" }, [{ type: ["shared", ...PACKAGE_TYPES] }]),
  allow({ type: "bridge" }, [{ type: ["shared", ...PACKAGE_TYPES] }]),
  allow({ type: "ui*" }, [
    { type: ["shared", "ui*", "package-ui", ...PACKAGE_TYPES] },
  ]),
  allow({ type: SERVER_TYPES }, [
    {
      type: ["shared", "cloud-publish", ...PACKAGE_TYPES, ...SERVER_TYPES],
    },
  ]),
  allow({ type: "desktop" }, [
    { type: ["shared", "desktop", ...PACKAGE_TYPES] },
    { captured: { mod: "data-lock" }, type: "platform" },
    { captured: { mod: "bridge-build" }, type: "platform" },
  ]),
  allow({ type: "cloud-publish" }, [
    { type: ["cloud-publish", ...PACKAGE_TYPES] },
  ]),
  allow({ type: "cloud-api" }, [{ type: ["cloud-api", ...PACKAGE_TYPES] }]),
  allow({ type: "tooling" }, [
    {
      type: [
        "shared",
        "main",
        "desktop",
        "tooling",
        "package-ui",
        ...PACKAGE_TYPES,
      ],
    },
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
  {
    name: "platform",
    paths: ["apps/desktop/src/server/platform"],
    type: "platform",
  },
  { areas: ["events"], name: "events" },
  { areas: ["store", "run-log"], name: "store" },
  { areas: ["app", "project-source"], name: "app-runtime" },
  { areas: ["design-system"], name: "ds-model" },
  { areas: ["direct-edit"], name: "edit-engine" },
  { areas: ["components"], name: "component-model" },
  { areas: ["preview"], name: "preview" },
  { areas: ["page-probe", "layers"], name: "page-probe" },
  { areas: ["canvas"], name: "canvas-core" },
  {
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
    name: "app-flow",
  },
  {
    areas: [
      "share",
      "publish",
      "ship",
      "variations",
      "git",
      "cloud",
      "project-ops",
    ],
    name: "share",
  },
  {
    name: "handlers",
    paths: ["apps/desktop/src/server/handlers"],
    type: "handlers",
  },
  {
    name: "agent-kit",
    paths: ["apps/desktop/src/server/agent-tools"],
    type: "agent-kit",
  },
  { name: "agent", paths: ["apps/desktop/src/server/agent"], type: "agent" },
  {
    name: "adapter",
    paths: ["apps/desktop/src/server/http", "apps/desktop/src/server/mcp"],
    type: "adapter",
  },
  { name: "main", paths: ["apps/desktop/src/server/main"], type: "main" },
];

const selectorsOf = (layer: Layer): ElementSelector[] =>
  layer.areas
    ? layer.areas.map((area) => ({ captured: { area }, type: "domain" }))
    : [{ type: layer.type ?? "server" }];

export const globsOf = (layer: Layer): string[] =>
  (layer.areas
    ? layer.areas.map((area) => `apps/desktop/src/server/${area}`)
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
      { type: ["shared", "cloud-publish", ...PACKAGE_TYPES] },
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
  message:
    "Browser I/O outside apps/desktop/src/ui/platform is banned. Use the helpers from apps/desktop/src/ui/platform.",
  name,
}));

export const STUDIO_DESKTOP = [
  {
    message:
      "window.studioDesktop outside apps/desktop/src/ui/platform is banned. Use the desktop helpers from apps/desktop/src/ui/platform.",
    object: "window",
    property: "studioDesktop",
  },
];

export const SHARED_DOM = ["document", "window"].map((name) => ({
  message:
    "DOM globals in apps/desktop/src/shared are banned. Use values passed in from apps/desktop/src/ui.",
  name,
}));

export const UI_IO_OVERRIDES: OxlintOverride[] = [
  {
    files: ["apps/desktop/src/ui/**"],
    rules: {
      "no-restricted-globals": ["error", ...UI_GLOBALS],
      "no-restricted-properties": ["error", ...STUDIO_DESKTOP],
    },
  },
  {
    files: ["apps/desktop/src/ui/platform/**"],
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
