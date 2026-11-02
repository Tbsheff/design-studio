import type { OxlintOverride } from "oxlint";

import { dependencies } from "./boundaries.ts";
import { LEGACY_GLOBS, SHARED_DOM } from "./legacy.ts";

type Pattern = {
  group: string[];
  message: string;
  allowTypeImports?: boolean;
  importNames?: string[];
};

const ban = (group: string[], message: string): Pattern => ({ group, message });

const typeOnly = (group: string[], message: string): Pattern => ({
  group,
  message,
  allowTypeImports: true,
});

const NO_SERVER = ban(
  ["**/server/**"],
  "Importing src/server from this side is banned. Use the op types from src/shared/contract."
);
const NO_UI = ban(
  ["**/ui/**"],
  "Importing src/ui from this side is banned. Use the shared types from src/shared."
);
const NO_BRIDGE = ban(
  ["**/bridge/**"],
  "Importing src/bridge from this side is banned. Use the bridge message types from src/shared."
);
const NO_DESKTOP = ban(
  ["**/desktop/**"],
  "Importing desktop from this side is banned. Use the desktop helpers from src/ui/platform."
);
const NO_NODE = ban(
  ["node:*"],
  "Node built-ins on this platform are banned. Use Web APIs or the helpers from src/shared."
);
const NO_REACT = ban(
  ["react", "react/*", "react-dom", "react-dom/*"],
  "React in src/shared is banned. Use plain TypeScript from src/shared."
);

const BROWSER_LIBS = [
  typeOnly(
    ["effect", "effect/*", "zod", "zod/*"],
    "Value imports of effect and zod in browser code are banned. Use import type, or call(op) from src/ui/platform/http.ts."
  ),
  ban(
    ["hono", "hono/*", "@anthropic-ai/*"],
    "Server libraries in browser code are banned. Use call(op) from src/ui/platform/http.ts."
  ),
];

const SERVER_ONLY_TEST = ban(
  ["**/test-fakes*", "**/testing/**"],
  "Test helpers in shipped server code are banned. Use the real Layer from src/server/platform."
);

const EFFECT_SERVER = ban(
  ["effect/http-api", "effect/process", "effect/unstable/*"],
  "The unstable and HTTP API Effect modules are banned. Use the platform Effect modules from src/server/platform."
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
  "Adapters and transport libraries in domain code are banned. Use a service from src/server/services."
);

const CHILD_PROCESS = ban(
  ["node:child_process"],
  "Spawning processes outside src/server/platform and src/server/main is banned. Use the process service from src/server/platform/process."
);

const UI_DOMAIN = ban(
  ["react-dom", "react-dom/*", "**/platform/**", "**/components/**"],
  "React DOM, platform and component imports in ui/domain are banned. Use pure functions from src/ui/domain."
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
    "Other react-dom APIs in ui/kit are banned. Use createPortal from react-dom.",
};

const FEATURE_TARGETS = [
  "shared",
  "shared-contract",
  "ui-kit",
  "ui-domain",
  "ui-platform",
  "ui",
];

const FEATURE_POLICIES = [
  {
    from: { element: { type: "ui-feature" } },
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
  },
];

const UI_CONTRACT = typeOnly(
  [
    "**/shared/contract",
    "**/shared/contract/**",
    "!**/shared/contract/**/routes.js",
  ],
  "Value imports from shared/contract in src/ui are banned. Use import type, or the ops from shared/contract/<ctx>/routes.js."
);

const SERVICE_LIBS = ban(
  ["node:*", "hono", "hono/*", "@modelcontextprotocol/*", "@anthropic-ai/*"],
  "Node built-ins and transport libraries in services are banned. Use a platform service from src/server/platform."
);

const ENGINE = ban(
  ["effect", "effect/*", "node:*", "**/platform/**"],
  "Effect, Node built-ins and platform imports in engine code are banned. Use plain functions from the engine folder."
);

const V3_NAMES = ["Service", "Tag"]
  .map((property) => ({
    object: "Effect",
    property,
    message: "Effect v3 names are banned. Use Context.Service from effect.",
  }))
  .concat([
    {
      object: "Context",
      property: "Tag",
      message: "Effect v3 names are banned. Use Context.Service from effect.",
    },
  ]);

const restrict = (files: string[], patterns: Pattern[]): OxlintOverride => ({
  files,
  rules: { "no-restricted-imports": ["error", { patterns }] },
});

export const COARSE_FOLDERS = {
  "src/ui": [NO_SERVER, NO_BRIDGE, NO_DESKTOP],
  "src/bridge": [NO_UI, NO_SERVER],
  "src/shared": [NO_UI, NO_SERVER, NO_BRIDGE, NO_DESKTOP],
  "src/server": [NO_UI, NO_BRIDGE],
} as const;

const UI = [...COARSE_FOLDERS["src/ui"], ...BROWSER_LIBS, UI_CONTRACT];
const SERVER = [...COARSE_FOLDERS["src/server"], EFFECT_SERVER];

const NEW_DOMAIN_AREAS = [
  "events",
  "run-log",
  "project-source",
  "page-probe",
  "ship",
];

const domainRows = NEW_DOMAIN_AREAS.flatMap((area) => {
  if (LEGACY_GLOBS.includes(`src/server/${area}/**`)) {
    return [];
  }

  return [
    restrict(
      [`src/server/${area}/**`],
      [...SERVER, SERVER_ONLY_TEST, DOMAIN_ADAPTERS, CHILD_PROCESS]
    ),
    restrict(
      [`src/server/${area}/**/*.test.ts`],
      [...SERVER, DOMAIN_ADAPTERS, CHILD_PROCESS]
    ),
  ];
});

const serverRows = [
  restrict(["src/server/**"], [...SERVER, SERVER_ONLY_TEST]),
  restrict(["src/server/**/*.test.ts"], SERVER),
  restrict(
    ["src/server/services/**"],
    [...SERVER, SERVER_ONLY_TEST, CHILD_PROCESS, SERVICE_LIBS]
  ),
  restrict(
    ["src/server/services/**/*.test.ts"],
    [...SERVER, CHILD_PROCESS, SERVICE_LIBS]
  ),
  ...domainRows,
];

const uiRows = [
  restrict(["src/ui/**"], [...UI, NO_NODE]),
  restrict(["src/ui/**/*.test.ts", "src/ui/**/*.test.tsx"], UI),
  restrict(["src/ui/domain/**"], [...UI, NO_NODE, UI_DOMAIN]),
  restrict(["src/ui/kit/**"], [...UI, NO_NODE, UI_KIT_PORTAL]),
  restrict(["src/ui/features/**"], [...UI, NO_NODE]),
  {
    files: ["src/ui/features/**"],
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
    ["src/bridge/**"],
    [...COARSE_FOLDERS["src/bridge"], ...BROWSER_LIBS, NO_NODE]
  ),
  restrict(
    ["src/shared/**"],
    [...COARSE_FOLDERS["src/shared"], NO_NODE, NO_REACT]
  ),
  ...serverRows,
  ...engineRows,
  {
    files: ["src/shared/**"],
    rules: { "no-restricted-globals": ["error", ...SHARED_DOM] },
  },
  {
    files: ["src/server/**"],
    rules: { "no-restricted-properties": ["error", ...V3_NAMES] },
  },
];
