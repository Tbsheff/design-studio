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
  element("adapter", "src/server/agent-tools"),
  element("main", "src/server/main"),
  element("domain", "src/server/*", ["area"]),
  element("server", "src/server"),
  element("ui-kit", "src/ui/kit"),
  element("ui-kit", "src/ui/ai"),
  element("ui-domain", "src/ui/domain"),
  element("ui-platform", "src/ui/platform"),
  element("ui-feature", "src/ui/features/*", ["feature"]),
  element("ui", "src/ui"),
  element("desktop", "desktop"),
  element("cloud-publish", "cloud/publish-worker"),
  element("cloud-api", "cloud/api"),
  element("tooling", "scripts"),
  element("tooling", "e2e"),
  element("tooling", "lint"),
];

const SERVER_TYPES = [
  "platform",
  "domain",
  "handlers",
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
      "icons",
      "mcp-life",
    ],
  },
  {
    name: "share",
    areas: ["share", "publish", "ship", "variations", "git", "cloud"],
  },
  { name: "handlers", type: "handlers", paths: ["src/server/handlers"] },
  { name: "agent", type: "agent", paths: ["src/server/agent"] },
  {
    name: "adapter",
    type: "adapter",
    paths: ["src/server/http", "src/server/mcp", "src/server/agent-tools"],
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
