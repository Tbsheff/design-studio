import { isKnownToolName, isLegacyServedPath } from "./tool-facts.js";
import { fieldOf, rule, specOf, stringAt, verbOf } from "./ast.js";

const LIST_VERBS = new Set(["list", "search"]);

const TOOL_WORD = /\b(?<verb>[a-z]+)(?:_[a-z0-9]+)+\b/gu;

const TOOL_VERBS = new Set([
  "add",
  "apply",
  "create",
  "delete",
  "do",
  "duplicate",
  "edit",
  "export",
  "fetch",
  "generate",
  "get",
  "handle",
  "import",
  "insert",
  "inspect",
  "list",
  "load",
  "make",
  "move",
  "process",
  "publish",
  "remove",
  "rename",
  "restore",
  "retrieve",
  "run",
  "search",
  "set",
  "share",
  "start",
  "stop",
  "unpublish",
  "update",
]);

const PAGE_MESSAGE =
  "A list or search action without PageFields in its input and pageOf in its output is banned. Use ...PageFields in the input Schema.Struct and output: pageOf(<Item>Schema) from packages/common/actions/src/_core/list-page.ts.";

const DELETE_MESSAGE =
  'A delete action that is not access "destructive" with confirm "user" is banned. Use access: "destructive", confirm: "user" and a preview export in src/server/handlers/<domain>/<verb>.ts.';

const TOOL_TEXT_MESSAGE =
  "A tool name in an action description or short text that no action or legacy tool has is banned. Use the derived tool name of the action from scripts/stamp/names.ts, or a name in artifacts/mcp-snapshots/*.json.";

const BOOTSTRAP_MESSAGE =
  'mcp off "ui-bootstrap" on an action whose HTTP path a hand-written MCP tool in src/server/mcp still calls is banned. Use { off: "legacy-mcp" } from packages/common/actions/src/_core/action.ts until the legacy tool moves to mcp { name }.';

const isPageCall = (node) =>
  node !== null &&
  node.type === "CallExpression" &&
  node.callee.type === "Identifier" &&
  node.callee.name === "pageOf";

const isPageSpread = (property) =>
  property.type === "SpreadElement" &&
  property.argument.type === "Identifier" &&
  property.argument.name === "PageFields";

const structFields = (node) => {
  if (node?.type !== "CallExpression") {
    return [];
  }

  const [first = null] = node.arguments;

  if (first === null || first.type !== "ObjectExpression") {
    return [];
  }

  return first.properties;
};

const hasPageInput = (spec) =>
  structFields(fieldOf(spec, "input")).some((property) => isPageSpread(property));

const listPage = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);
    const id = spec && stringAt(spec, "id");

    if (id === null || !LIST_VERBS.has(verbOf(id))) {
      return;
    }

    if (!hasPageInput(spec) || !isPageCall(fieldOf(spec, "output"))) {
      context.report({ message: PAGE_MESSAGE, node: spec });
    }
  },
}));

const isDestructiveUser = (spec) =>
  stringAt(spec, "access") === "destructive" && stringAt(spec, "confirm") === "user";

const deleteDestructive = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);
    const id = spec && stringAt(spec, "id");

    if (id !== null && verbOf(id) === "delete" && !isDestructiveUser(spec)) {
      context.report({ message: DELETE_MESSAGE, node: spec });
    }
  },
}));

const textNodesOf = (spec) => {
  const agent = fieldOf(spec, "agent");
  const nodes = [fieldOf(spec, "description")];

  if (agent !== null && agent.type === "ObjectExpression") {
    nodes.push(fieldOf(agent, "short"));
  }

  return nodes.filter((node) => node !== null);
};

const rawTextOf = (node) => {
  if (node.type === "Literal") {
    return String(node.value);
  }

  if (node.type === "TemplateLiteral") {
    return node.quasis.map((quasi) => quasi.value.raw).join(" ");
  }

  return "";
};

const checkToolText = (context, node) => {
  for (const match of rawTextOf(node).matchAll(TOOL_WORD)) {
    if (TOOL_VERBS.has(match.groups.verb) && !isKnownToolName(match[0])) {
      context.report({ message: TOOL_TEXT_MESSAGE, node });
    }
  }
};

const descriptionToolName = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);

    if (spec !== null) {
      for (const text of textNodesOf(spec)) {
        checkToolText(context, text);
      }
    }
  },
}));

const routeOf = (spec) => {
  const http = fieldOf(spec, "http");

  if (http === null || http.type !== "ObjectExpression") {
    return null;
  }

  return { method: stringAt(http, "method"), path: stringAt(http, "path") };
};

const mcpOffOf = (spec) => {
  const mcp = fieldOf(spec, "mcp");

  if (mcp === null || mcp.type !== "ObjectExpression") {
    return null;
  }

  return stringAt(mcp, "off");
};

const bootstrapOffReason = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);

    if (spec === null || mcpOffOf(spec) !== "ui-bootstrap") {
      return;
    }

    const route = routeOf(spec);

    if (route !== null && route.path !== null && isLegacyServedPath(route.method, route.path)) {
      context.report({ message: BOOTSTRAP_MESSAGE, node: fieldOf(spec, "mcp") });
    }
  },
}));

export { bootstrapOffReason, deleteDestructive, descriptionToolName, listPage };
