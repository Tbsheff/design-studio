import { keyName, rule } from "./ast.js";

const VERBS = new Set([
  "apply",
  "create",
  "delete",
  "duplicate",
  "export",
  "get",
  "import",
  "insert",
  "inspect",
  "list",
  "move",
  "publish",
  "rename",
  "restore",
  "run",
  "search",
  "set",
  "share",
  "start",
  "stop",
  "unpublish",
  "update",
]);

const TOOL_NAME = /^[a-z]+_[a-z0-9_]+$/u;

const ORG_ID = "orgId";

const TQ_MESSAGE =
  "A tq tenant query outside cloud/api/src/tenant/repos is banned. Use a repo method in cloud/api/src/tenant/repos/<table>.ts and yield that repo.";

const PREPARE_MESSAGE =
  "Raw db.prepare() in a tenant repo is banned, because it skips the :org bind and the org_id row check. Use tq from cloud/api/src/tenant/sql.ts with TenantDb from cloud/api/src/tenant/db.ts.";

const ORG_PARAM_MESSAGE =
  "An orgId parameter or input field in a tenant repo method is banned, because the caller can pass another org. Use :org in the tq query; TenantDb binds it from CurrentOrg in cloud/api/src/tenant/current-org.ts.";

const VERB_MESSAGE =
  "A cloud MCP tool name that does not start with an N3 verb (add, fetch, make, remove and edit are banned) is banned. Use <verb>_<noun> with a verb from the N3 list in AGENTS.md, for example create_comment.";

const isNamed = (node, name) => node?.type === "Identifier" && node.name === name;

const tenantSqlInRepos = rule((context) => ({
  TaggedTemplateExpression: (node) => {
    if (isNamed(node.tag, "tq")) {
      context.report({ message: TQ_MESSAGE, node });
    }
  },
}));

const repoUsesTq = rule((context) => ({
  CallExpression: (node) => {
    const { callee } = node;

    if (callee.type === "MemberExpression" && !callee.computed && callee.property.name === "prepare") {
      context.report({ message: PREPARE_MESSAGE, node });
    }
  },
}));

const isOrgParam = (param) => {
  if (isNamed(param, ORG_ID)) {
    return true;
  }

  return param.type === "ObjectPattern" && param.properties.some((property) => keyName(property) === ORG_ID);
};

const checkParams = (context, node) => {
  for (const param of node.params) {
    if (isOrgParam(param)) {
      context.report({ message: ORG_PARAM_MESSAGE, node: param });
    }
  }
};

const noOrgIdParam = rule((context) => ({
  ArrowFunctionExpression: (node) => checkParams(context, node),
  FunctionDeclaration: (node) => checkParams(context, node),
  FunctionExpression: (node) => checkParams(context, node),
  MemberExpression: (node) => {
    if (isNamed(node.object, "input") && !node.computed && isNamed(node.property, ORG_ID)) {
      context.report({ message: ORG_PARAM_MESSAGE, node });
    }
  },
}));

const toolNameOf = (node) => {
  if (keyName(node) !== "name" || node.value.type !== "Literal") {
    return null;
  }

  const { value } = node.value;

  if (value !== String(value) || !TOOL_NAME.test(value)) {
    return null;
  }

  return value;
};

const cloudToolVerb = rule((context) => ({
  Property: (node) => {
    const value = toolNameOf(node);

    if (value === null) {
      return;
    }

    const [verb] = value.split("_");

    if (!VERBS.has(verb)) {
      context.report({ message: VERB_MESSAGE, node: node.value });
    }
  },
}));

export { cloudToolVerb, noOrgIdParam, repoUsesTq, tenantSqlInRepos };
