import { keyName, rule, specOf, stringAt, fieldOf } from "./ast.js";

const OWN_IDS = new Set(["orgId", "projectId"]);

const SCOPE_MESSAGE =
  'An action with needs "project.*" and scope "org" whose input names a project-owned id (runId, directionId, versionId) is banned (T3), because the runner never calls ProjectAccess.visible for the owning project. Use scope: "project" with projectId in the input from packages/common/actions/src/_core/ids.ts.';

const SCHEMA_NAME = /Schema$/u;

const JSON_MESSAGE =
  "Schema.Json in an action output is banned (E12), because the runner decode, the MCP JSON Schema and WireOutput check nothing. Use a typed Schema.Struct in packages/common/actions/src/<domain>/schema.ts.";

const isNamed = (node, name) => node.type === "Identifier" && node.name === name;

const isMember = (node, object, property) =>
  !node.computed && isNamed(node.object, object) && isNamed(node.property, property);

const fieldsOf = (input) => {
  if (input?.type !== "CallExpression") {
    return null;
  }

  const [fields] = input.arguments;

  return fields ?? null;
};

const inputKeysOf = (spec) => {
  const fields = fieldsOf(fieldOf(spec, "input"));

  if (fields?.type !== "ObjectExpression") {
    return [];
  }

  return fields.properties.map((property) => keyName(property)).filter((key) => key !== null);
};

const isOwnedId = (key) => key.endsWith("Id") && !OWN_IDS.has(key);

const projectScopeNeeds = rule((context) => ({
  CallExpression: (node) => {
    const spec = specOf(node);

    if (spec === null || stringAt(spec, "scope") !== "org") {
      return;
    }

    const needs = stringAt(spec, "needs") ?? "";

    if (needs.startsWith("project.") && inputKeysOf(spec).some((key) => isOwnedId(key))) {
      context.report({ message: SCOPE_MESSAGE, node: fieldOf(spec, "scope") });
    }
  },
}));

const isOutputHolder = (node) => {
  if (node.type === "Property") {
    return keyName(node) === "output";
  }

  return node.type === "VariableDeclarator" && node.id.type === "Identifier" && SCHEMA_NAME.test(node.id.name);
};

const isInOutput = (node) => {
  for (let current = node.parent; current; current = current.parent) {
    if (isOutputHolder(current)) {
      return true;
    }
  }

  return false;
};

const noJsonSchema = rule((context) => ({
  MemberExpression: (node) => {
    if (isMember(node, "Schema", "Json") && isInOutput(node)) {
      context.report({ message: JSON_MESSAGE, node });
    }
  },
}));

export { noJsonSchema, projectScopeNeeds };
