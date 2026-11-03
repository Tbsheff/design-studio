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
  "An action id verb outside the N3 list is banned. Use a verb from the N3 list in AGENTS.md, and keep the old tool name with mcp.name in src/shared/actions/<domain>/<verb>.ts.";

const AGENT_MESSAGE =
  'agent off "ui-bootstrap" on a write or an MCP action is banned. Use agent { lean, name, set, short } or { off: "legacy-agent" } from src/shared/actions/_core/action.ts.';

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

export { actionVerb, agentOffReason };
