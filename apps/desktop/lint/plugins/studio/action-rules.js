import { relativeOf } from "./facts.js";
import { rule, specOf, stringAt, fieldOf, verbOf } from "./ast.js";

const VERBS = new Set(
  [
    "get list search inspect",
    "create update set insert rename move duplicate delete restore",
    "start stop run apply export import publish unpublish share",
  ]
    .join(" ")
    .split(" ")
);

const PILOT_IDS = new Set(["studio.health"]);

const VERB_MESSAGE =
  "An action id verb outside the N3 list is banned. Use a verb from the N3 list in AGENTS.md, and keep the old tool name with mcp.name in packages/common/actions/src/<domain>/<verb>.ts.";

const AGENT_MESSAGE =
  'agent off "ui-bootstrap" on a write or an MCP action is banned. Use agent { lean, name, set, short } or { off: "legacy-agent" } from packages/common/actions/src/_core/action.ts.';

const actionVerb = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);
    const id = spec && stringAt(spec, "id");

    if (id === null || PILOT_IDS.has(id) || VERBS.has(verbOf(id))) {
      return;
    }

    context.report({ message: VERB_MESSAGE, node });
  },
}));

const hasMcpName = (spec) => {
  const mcp = fieldOf(spec, "mcp");

  return (
    mcp !== null &&
    mcp.type === "ObjectExpression" &&
    stringAt(mcp, "name") !== null
  );
};

const isBootstrap = (spec) => {
  const agent = fieldOf(spec, "agent");

  return (
    agent !== null &&
    agent.type === "ObjectExpression" &&
    stringAt(agent, "off") === "ui-bootstrap"
  );
};

const agentOffReason = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);

    if (spec === null || !isBootstrap(spec)) {
      return;
    }

    if (stringAt(spec, "access") !== "read" || hasMcpName(spec)) {
      context.report({ message: AGENT_MESSAGE, node: spec });
    }
  },
}));

const WRITE_ACCESS = new Set(["destructive", "edit"]);

const READ_ONLY_PERMISSION = "studio.read";

const PERMISSION_MESSAGE =
  'An edit or destructive action with needs "studio.read" is banned. Use a write permission such as "studio.write" from packages/common/actions/src/_core/permissions.ts.';

const DOMAIN_MESSAGE =
  "An action domain that is not one singular kebab-case noun, or that differs from its folder, is banned. Use packages/common/actions/src/<domain>/<verb>.ts with id <domain>.<verb>, for example project, version, dev-server.";

const DOMAIN_PATTERN = /^[a-z]+(?:-[a-z]+)*$/u;

const SURFACES = new Set(["agent", "http", "mcp", "route", "tool"]);

const PLURAL_WORD = /[^asu]s$/u;

const ACTION_FOLDER = /^src\/shared\/actions\/(?<folder>[a-z0-9-]+)\//u;

const writeNeedsWritePermission = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);

    if (spec === null || !WRITE_ACCESS.has(stringAt(spec, "access"))) {
      return;
    }

    if (stringAt(spec, "needs") === READ_ONLY_PERMISSION) {
      context.report({ message: PERMISSION_MESSAGE, node: spec });
    }
  },
}));

const isGoodDomain = (domain, folder) => {
  const words = domain.split("-");
  const last = words.at(-1) ?? "";

  return (
    DOMAIN_PATTERN.test(domain) &&
    domain === folder &&
    !words.some((word) => SURFACES.has(word)) &&
    !PLURAL_WORD.test(last)
  );
};

const actionDomainName = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);
    const id = spec && stringAt(spec, "id");
    const match = ACTION_FOLDER.exec(relativeOf(context.filename));

    if (id === null || match === null || PILOT_IDS.has(id)) {
      return;
    }

    const [domain = ""] = id.split(".");

    if (!isGoodDomain(domain, match.groups.folder)) {
      context.report({ message: DOMAIN_MESSAGE, node: spec });
    }
  },
}));

export {
  actionDomainName,
  actionVerb,
  agentOffReason,
  writeNeedsWritePermission,
};
