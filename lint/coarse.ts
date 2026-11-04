import type { OxlintOverride } from "oxlint";

import { SHARED_DOM, UI_IO_OVERRIDES, dependencies } from "./boundaries.ts";

interface Pattern {
  group: string[];
  message: string;
  allowTypeImports?: boolean;
  importNames?: string[];
}

const ban = (group: string[], message: string): Pattern => ({ group, message });

const typeOnly = (group: string[], message: string): Pattern => ({
  allowTypeImports: true,
  group,
  message,
});

const NO_SERVER = ban(
  ["**/server/**"],
  "Importing apps/desktop/src/server from this side is banned. Use the op types from apps/desktop/src/shared/contract."
);

const NO_UI = ban(
  ["**/ui/**"],
  "Importing apps/desktop/src/ui from this side is banned. Use the shared types from apps/desktop/src/shared."
);

const NO_BRIDGE = ban(
  ["**/bridge/**"],
  "Importing apps/desktop/src/bridge from this side is banned. Use the bridge message types from apps/desktop/src/shared."
);

const NO_DESKTOP = ban(
  ["**/desktop/**"],
  "Importing desktop from this side is banned. Use the desktop helpers from apps/desktop/src/ui/platform."
);

const NO_APPS = ban(
  ["**/apps/**"],
  "Packages importing apps is banned. Use only package imports through their exports map."
);

const NO_NODE = ban(
  ["node:*"],
  "Node built-ins on this platform are banned. Use Web APIs or the helpers from apps/desktop/src/shared."
);

const NO_REACT = ban(
  ["react", "react/*", "react-dom", "react-dom/*"],
  "React in apps/desktop/src/shared is banned. Use plain TypeScript from apps/desktop/src/shared."
);

const BROWSER_LIBS = [
  typeOnly(
    ["effect", "effect/*", "zod", "zod/*"],
    "Value imports of effect and zod in browser code are banned. Use import type, or call(op) from apps/desktop/src/ui/platform/http.ts."
  ),
  ban(
    ["hono", "hono/*", "@anthropic-ai/*"],
    "Server libraries in browser code are banned. Use call(op) from apps/desktop/src/ui/platform/http.ts."
  ),
];

const SERVER_ONLY_TEST = ban(
  ["**/test-fakes*", "**/testing/**"],
  "Test helpers in shipped server code are banned. Use the real Layer from apps/desktop/src/server/platform."
);

const EFFECT_SERVER = ban(
  ["effect/http-api", "effect/process", "effect/unstable/*"],
  "The unstable and HTTP API Effect modules are banned. Use the platform Effect modules from apps/desktop/src/server/platform."
);

const DOMAIN_ADAPTERS = ban(
  [
    "hono",
    "hono/*",
    "@hono/*",
    "@modelcontextprotocol/*",
    "@anthropic-ai/claude-agent-sdk",
    "**/http/**",
    "**/mcp/**",
    "**/agent-tools/**",
  ],
  "Adapters and transport libraries in domain code are banned. Use a service from apps/desktop/src/server/services."
);

const CHILD_PROCESS = ban(
  ["node:child_process"],
  "Spawning processes outside apps/desktop/src/server/platform and apps/desktop/src/server/main is banned. Use the process service from apps/desktop/src/server/platform/process."
);

const UI_DOMAIN = ban(
  ["react-dom", "react-dom/*", "**/platform/**", "**/components/**"],
  "React DOM, platform and component imports in ui/domain are banned. Use pure functions from apps/desktop/src/ui/domain."
);

const UI_KIT_PORTAL: Pattern = {
  group: ["react-dom"],
  importNames: [
    "render",
    "hydrate",
    "flushSync",
    "unmountComponentAtNode",
    "findDOMNode",
  ],
  message:
    "Other react-dom APIs in packages/ui are banned. Use createPortal from react-dom.",
};

const FEATURE_TARGETS = [
  "shared",
  "package-actions",
  "package-contracts",
  "package-ui",
  "ui-kit",
  "ui-domain",
  "ui-platform",
  "ui",
];

const FEATURE_POLICIES = [
  {
    allow: [
      { to: { element: { type: FEATURE_TARGETS } } },
      {
        to: {
          element: {
            type: "ui-feature",
            captured: { feature: "{{ from.element.captured.feature }}" },
          },
        },
      },
    ],
    from: { element: { type: "ui-feature" } },
  },
];

const UI_ACTIONS = typeOnly(
  [
    "@design-studio/actions",
    "@design-studio/actions/**",
    "!@design-studio/actions/*/routes",
  ],
  "Value imports from @design-studio/actions in apps/desktop/src/ui are banned. Use import type, or the routes from @design-studio/actions/<domain>/routes."
);

const SERVICE_LIBS = ban(
  ["node:*", "hono", "hono/*", "@modelcontextprotocol/*", "@anthropic-ai/*"],
  "Node built-ins and transport libraries in services are banned. Use a platform service from apps/desktop/src/server/platform."
);

const ENGINE = ban(
  ["effect", "effect/*", "node:*", "**/platform/**"],
  "Effect, Node built-ins and platform imports in engine code are banned. Use plain functions from the engine folder."
);

const V3_NAMES = ["Service", "Tag"]
  .map((property) => ({
    message: "Effect v3 names are banned. Use Context.Service from effect.",
    object: "Effect",
    property,
  }))
  .concat([
    {
      message: "Effect v3 names are banned. Use Context.Service from effect.",
      object: "Context",
      property: "Tag",
    },
  ]);

const restrict = (files: string[], patterns: Pattern[]): OxlintOverride => ({
  files,
  rules: { "no-restricted-imports": ["error", { patterns }] },
});

export const COARSE_FOLDERS = {
  "apps/desktop/src/bridge": [NO_UI, NO_SERVER],
  "apps/desktop/src/server": [NO_UI, NO_BRIDGE],
  "apps/desktop/src/shared": [NO_UI, NO_SERVER, NO_BRIDGE, NO_DESKTOP],
  "apps/desktop/src/ui": [NO_SERVER, NO_BRIDGE, NO_DESKTOP],
} as const;

const UI = [
  ...COARSE_FOLDERS["apps/desktop/src/ui"],
  ...BROWSER_LIBS,
  UI_ACTIONS,
];

const SERVER = [...COARSE_FOLDERS["apps/desktop/src/server"], EFFECT_SERVER];

const NEW_DOMAIN_AREAS = [
  "events",
  "run-log",
  "project-source",
  "page-probe",
  "ship",
];

const domainRows = NEW_DOMAIN_AREAS.flatMap((area) => [
  restrict(
    [`apps/desktop/src/server/${area}/**`],
    [...SERVER, SERVER_ONLY_TEST, DOMAIN_ADAPTERS, CHILD_PROCESS]
  ),
  restrict(
    [`apps/desktop/src/server/${area}/**/*.test.ts`],
    [...SERVER, DOMAIN_ADAPTERS, CHILD_PROCESS]
  ),
]);

const serverRows = [
  restrict(["apps/desktop/src/server/**"], [...SERVER, SERVER_ONLY_TEST]),
  restrict(["apps/desktop/src/server/**/*.test.ts"], SERVER),
  restrict(
    ["apps/desktop/src/server/handlers/**"],
    [...SERVER, SERVER_ONLY_TEST, CHILD_PROCESS, SERVICE_LIBS]
  ),
  restrict(
    ["apps/desktop/src/server/handlers/**/*.test.ts"],
    [...SERVER, CHILD_PROCESS, SERVICE_LIBS]
  ),
  ...domainRows,
];

const uiRows = [
  restrict(["apps/desktop/src/ui/**"], [...UI, NO_NODE]),
  restrict(
    ["apps/desktop/src/ui/**/*.test.ts", "apps/desktop/src/ui/**/*.test.tsx"],
    UI
  ),
  restrict(["apps/desktop/src/ui/domain/**"], [...UI, NO_NODE, UI_DOMAIN]),
  restrict(["packages/ui/src/**"], [...UI, NO_NODE, UI_KIT_PORTAL, NO_APPS]),
  restrict(["apps/desktop/src/ui/features/**"], [...UI, NO_NODE]),
  {
    files: ["apps/desktop/src/ui/features/**"],
    rules: {
      "boundaries/dependencies": dependencies("error", FEATURE_POLICIES),
    },
  },
];

const engineGlob = (glob: string): string =>
  glob.replace(/\/\*\*(?<test>\/\*\.test\.tsx?)?$/u, "/**/engine/**$<test>");

const engineRowOf = (row: OxlintOverride): OxlintOverride[] => {
  const setting = row.rules?.["no-restricted-imports"];

  if (!Array.isArray(setting)) {
    return [];
  }

  const { patterns } = setting[1] as { patterns: Pattern[] };

  return [restrict(row.files.map(engineGlob), [...patterns, ENGINE])];
};

const engineRows = [...uiRows, ...serverRows].flatMap((row) =>
  engineRowOf(row)
);

export const coarse: OxlintOverride[] = [
  ...uiRows,
  restrict(
    ["apps/desktop/src/bridge/**"],
    [...COARSE_FOLDERS["apps/desktop/src/bridge"], ...BROWSER_LIBS, NO_NODE]
  ),
  restrict(
    ["apps/desktop/src/shared/**"],
    [...COARSE_FOLDERS["apps/desktop/src/shared"], NO_NODE, NO_REACT]
  ),
  ...serverRows,
  ...engineRows,
  ...UI_IO_OVERRIDES,
  {
    files: ["apps/desktop/src/shared/**"],
    rules: { "no-restricted-globals": ["error", ...SHARED_DOM] },
  },
  {
    files: ["apps/desktop/src/server/**"],
    rules: { "no-restricted-properties": ["error", ...V3_NAMES] },
  },
];
