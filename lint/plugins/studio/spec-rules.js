import { isDomainFolder, isLegacyToolName, relativeOf } from "./facts.js";
import { fieldOf, rule, specOf, stringAt, verbOf } from "./ast.js";

const READ_VERBS = new Set(["get", "inspect", "list", "search"]);

const WRITE_ACCESS = new Set(["destructive", "edit"]);

const PILOT_IDS = new Set(["studio.health", "studio.listSkills"]);

const DOMAIN_NOUNS = new Set(["canvas", "component", "design", "project", "publication", "token"]);

const UNKNOWN_MESSAGE =
  "Schema.Unknown in an action schema is banned, because the runner decode, the MCP JSON Schema and WireInput check nothing. Use a typed Schema.Struct field in src/shared/actions/<domain>/schema.ts.";

const MCP_OFF_MESSAGE =
  'mcp off "ui-bootstrap" on an edit or destructive action is banned. Use mcp { name } with the snapshot or legacy tool name, or { off: "legacy-mcp" } from src/shared/actions/_core/action.ts while a legacy tool still serves it.';

const INVALIDATES_MESSAGE =
  "An edit or destructive action with invalidates: [] is banned, because useAction and action.done refresh nothing. Use the read action ids whose data it changes, for example version.list, in src/shared/actions/<domain>/<verb>.ts.";

const READ_VERB_MESSAGE =
  'A read verb (get, list, search, inspect) on an action that is not access "read" with GET is banned. Use access "read" and method "GET" with a flat query input, or a write or run verb from the N3 list in AGENTS.md.';

const TOOL_NAME_MESSAGE =
  "A hand-written MCP or agent tool name is banned. Use the derived name <verb>_<domain> from scripts/stamp/names.ts, or a legacy name from artifacts/mcp-snapshots/*.json or src/server/mcp/legacy/order.ts.";

const OBJECT_MESSAGE =
  "An action object that names another domain noun (token, component, project, design, canvas, publication) is banned. Use the noun domain: src/shared/actions/<noun>/<verb>.ts with id <noun>.<verb>.";

const isNamed = (node, name) => node.type === "Identifier" && node.name === name;

const isMember = (node, object, property) =>
  node.type === "MemberExpression" &&
  !node.computed &&
  isNamed(node.object, object) &&
  node.property.name === property;

const actionSchemaTyped = rule((context) => ({
  MemberExpression: (node) => {
    if (isMember(node, "Schema", "Unknown")) {
      context.report({ message: UNKNOWN_MESSAGE, node });
    }
  },
}));

const offOf = (spec, key) => {
  const binding = fieldOf(spec, key);

  if (binding === null || binding.type !== "ObjectExpression") {
    return null;
  }

  return stringAt(binding, "off");
};

const mcpOffReason = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);

    if (spec === null || offOf(spec, "mcp") !== "ui-bootstrap") {
      return;
    }

    if (WRITE_ACCESS.has(stringAt(spec, "access"))) {
      context.report({ message: MCP_OFF_MESSAGE, node: fieldOf(spec, "mcp") });
    }
  },
}));

const isEmptyArray = (node) => node !== null && node.type === "ArrayExpression" && node.elements.length === 0;

const editInvalidates = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);

    if (spec === null || !WRITE_ACCESS.has(stringAt(spec, "access"))) {
      return;
    }

    const invalidates = fieldOf(spec, "invalidates");

    if (isEmptyArray(invalidates)) {
      context.report({ message: INVALIDATES_MESSAGE, node: invalidates });
    }
  },
}));

const methodOf = (spec) => {
  const http = fieldOf(spec, "http");

  if (http === null || http.type !== "ObjectExpression") {
    return null;
  }

  return stringAt(http, "method");
};

const isReadGet = (spec) => stringAt(spec, "access") === "read" && methodOf(spec) === "GET";

const readVerbAccess = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);
    const id = spec && stringAt(spec, "id");

    if (id === null || !READ_VERBS.has(verbOf(id)) || isReadGet(spec)) {
      return;
    }

    context.report({ message: READ_VERB_MESSAGE, node: spec });
  },
}));

const kebab = (name) => name.replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, "$<lower>-$<upper>").toLowerCase();

const snake = (name) => kebab(name).replaceAll("-", "_");

const derivedTool = (id) => {
  const [domain = "", verb = ""] = id.split(".");

  return `${snake(verb)}_${domain.replaceAll("-", "_")}`;
};

const nameOf = (spec, key) => {
  const binding = fieldOf(spec, key);

  if (binding === null || binding.type !== "ObjectExpression") {
    return null;
  }

  const name = fieldOf(binding, "name");

  if (name === null || stringAt(binding, "name") === null) {
    return null;
  }

  return name;
};

const checkToolName = (context, spec, key) => {
  const id = stringAt(spec, "id");
  const node = nameOf(spec, key);

  if (node === null || id === null || PILOT_IDS.has(id)) {
    return;
  }

  if (node.value !== derivedTool(id) && !isLegacyToolName(node.value)) {
    context.report({ message: TOOL_NAME_MESSAGE, node });
  }
};

const derivedToolName = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);

    if (spec !== null) {
      checkToolName(context, spec, "mcp");
      checkToolName(context, spec, "agent");
    }
  },
}));

const HEAD_NOUNS = new Set(["component", "token"]);

const singular = (word) => word.replace(/s$/u, "");

const objectNounsOf = (id) => {
  const [, tail = ""] = id.split(".");
  const words = kebab(tail.slice(verbOf(id).length)).split("-").filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  return [singular(words.join("-")), singular(words[0])];
};

const nounOf = ([whole, head]) => {
  if (HEAD_NOUNS.has(head)) {
    return head;
  }

  if (DOMAIN_NOUNS.has(whole) || isDomainFolder(whole)) {
    return whole;
  }

  return null;
};

const isOtherNoun = (nouns, folder) => {
  const noun = nounOf(nouns);

  return noun !== null && noun !== folder;
};

const ACTION_FOLDER = /^src\/shared\/actions\/(?<folder>[a-z0-9-]+)\//u;

const actionDomainObject = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);
    const id = spec && stringAt(spec, "id");
    const match = ACTION_FOLDER.exec(relativeOf(context.filename));

    if (id === null || match === null) {
      return;
    }

    const nouns = objectNounsOf(id);

    if (nouns.length > 0 && isOtherNoun(nouns, match.groups.folder)) {
      context.report({ message: OBJECT_MESSAGE, node: spec });
    }
  },
}));

export {
  actionDomainObject,
  actionSchemaTyped,
  derivedToolName,
  editInvalidates,
  mcpOffReason,
  readVerbAccess,
};
