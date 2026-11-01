import type { OxlintOverride } from "oxlint";

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
  "Coarse layer rule: this side must not import src/server."
);
const NO_UI = ban(
  ["**/ui/**"],
  "Coarse layer rule: this side must not import src/ui."
);
const NO_BRIDGE = ban(
  ["**/bridge/**"],
  "Coarse layer rule: this side must not import src/bridge."
);
const NO_DESKTOP = ban(
  ["**/desktop/**"],
  "Coarse layer rule: this side must not import desktop."
);
const NO_NODE = ban(["node:*"], "Node built-ins do not run on this platform.");
const NO_REACT = ban(
  ["react", "react/*", "react-dom", "react-dom/*"],
  "src/shared stays framework free."
);

const BROWSER_LIBS = [
  typeOnly(
    ["effect", "effect/*", "zod", "zod/*"],
    "Browser code imports effect and zod as types only."
  ),
  ban(
    ["hono", "hono/*", "@anthropic-ai/*"],
    "Server libraries do not run in the browser."
  ),
];

const SERVER_ONLY_TEST = ban(
  ["**/test-fakes*", "**/testing/**"],
  "Test helpers stay out of shipped server code."
);

const EFFECT_SERVER = ban(
  ["effect/http-api", "effect/process", "effect/unstable/*"],
  "Use the platform Effect modules, not the unstable or HTTP API ones."
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
  "Domain code must not import adapters or transport libraries."
);

const CHILD_PROCESS = ban(
  ["node:child_process"],
  "Only src/server/platform and src/server/main spawn processes."
);

const UI_DOMAIN = ban(
  ["react-dom", "react-dom/*", "**/platform/**", "**/components/**"],
  "ui/domain is pure logic."
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
  message: "ui/kit may use createPortal from react-dom only.",
};

const UI_FEATURE = ban(
  ["**/features/*/!(index)", "**/features/*/!(index).js"],
  "Import another feature through its index.ts."
);

const V3_NAMES = ["Service", "Tag"]
  .map((property) => ({
    object: "Effect",
    property,
    message: "Effect v3 name; use Context.Service.",
  }))
  .concat([
    {
      object: "Context",
      property: "Tag",
      message: "Effect v3 name; use Context.Service.",
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

const UI = [...COARSE_FOLDERS["src/ui"], ...BROWSER_LIBS];
const SERVER = [...COARSE_FOLDERS["src/server"], EFFECT_SERVER];

const NEW_DOMAIN_AREAS = [
  "events",
  "run-log",
  "project-source",
  "page-probe",
  "ship",
];

const domainRows = NEW_DOMAIN_AREAS.filter(
  (area) => !LEGACY_GLOBS.includes(`src/server/${area}/**`)
).flatMap((area) => [
  restrict(
    [`src/server/${area}/**`],
    [...SERVER, SERVER_ONLY_TEST, DOMAIN_ADAPTERS, CHILD_PROCESS]
  ),
  restrict(
    [`src/server/${area}/**/*.test.ts`],
    [...SERVER, DOMAIN_ADAPTERS, CHILD_PROCESS]
  ),
]);

const serverRows = [
  restrict(["src/server/**"], [...SERVER, SERVER_ONLY_TEST]),
  restrict(["src/server/**/*.test.ts"], SERVER),
  restrict(
    ["src/server/services/**"],
    [...SERVER, SERVER_ONLY_TEST, CHILD_PROCESS]
  ),
  restrict(["src/server/services/**/*.test.ts"], [...SERVER, CHILD_PROCESS]),
  ...domainRows,
];

const uiRows = [
  restrict(["src/ui/**"], [...UI, NO_NODE]),
  restrict(["src/ui/**/*.test.ts", "src/ui/**/*.test.tsx"], UI),
  restrict(["src/ui/domain/**"], [...UI, NO_NODE, UI_DOMAIN]),
  restrict(["src/ui/kit/**"], [...UI, NO_NODE, UI_KIT_PORTAL]),
  restrict(["src/ui/features/**"], [...UI, NO_NODE, UI_FEATURE]),
];

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
  {
    files: ["src/shared/**"],
    rules: { "no-restricted-globals": ["error", ...SHARED_DOM] },
  },
  {
    files: ["src/server/**"],
    rules: { "no-restricted-properties": ["error", ...V3_NAMES] },
  },
];
