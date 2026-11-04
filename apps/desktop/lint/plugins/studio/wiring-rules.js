import {
  isDomainFolder,
  isWireErrorName,
  relativeOf,
  serviceFileCountOf,
  writeSiteFrom,
} from "./facts.js";
import { rule } from "./ast.js";

const ACCESS_KEY = "access";

const READ_IO_MESSAGE =
  'A service marked access "read" whose file or local imports write files, remove files, spawn or take screenshots is banned. Use declare public readonly access: "write", and serve the work from an edit or run action (POST).';

const WIRED_MESSAGE =
  "A Context.Service class that no other server file names is banned, because no live layer provides it. Use the service in a domain live layer: src/server/handlers/<domain>/live.ts.";

const ERROR_NAME_MESSAGE =
  "A server class with the same name as a wire error class in packages/common/actions/src is banned. Use one name for one thing: rename one class, for example <Noun>Failed for the wire error.";

const CORE_ERROR_MESSAGE =
  "A domain error in packages/common/actions/src/_core/errors is banned. Use packages/common/actions/src/<domain>/errors/<kebab>.ts for an error that only one domain fails with.";

const NOT_READY_MESSAGE =
  'A "not ready" failure as a BadRequest error is banned, because the client did nothing wrong. Use Unavailable from packages/common/actions/src/_core/errors/unavailable.ts (503), or requireBound from src/server/platform/runtime-slot/index.ts.';

const INPUT_DEFAULT_MESSAGE =
  "A default for an action input field with ?? in a handler is banned, because MCP, the agent and the UI do not see it. Use Schema.withDecodingDefault on the field in packages/common/actions/src/<domain>/<verb>.ts.";

const RUNTIME_CALL_MESSAGE =
  "An adapter that calls a service runtime getter or op (directEditCall, *RuntimeOf, *Call, an op that takes a runtime such as createProjectIn) is banned, because it skips decode, Authorizer.require, ProjectAccess.visible and action.done. Use mcp { name } on the action so that src/server/handlers/_core/run-action.ts serves it.";

const isAccessDeclare = (member) =>
  member.type === "PropertyDefinition" &&
  member.declare === true &&
  member.key.type === "Identifier" &&
  member.key.name === ACCESS_KEY;

const accessOfClass = (node) => {
  const member = node.body.body.find(isAccessDeclare);
  const literal = member?.typeAnnotation?.typeAnnotation?.literal ?? null;

  if (literal === null) {
    return null;
  }

  return literal.value;
};

const isContextService = (callee) =>
  callee.type === "MemberExpression" &&
  callee.object.type === "Identifier" &&
  callee.object.name === "Context" &&
  callee.property.name === "Service";

const isServiceClass = (node) => {
  const callee = node.superClass?.callee?.callee ?? null;

  return callee !== null && isContextService(callee);
};

const readServiceIo = rule((context) => ({
  ClassDeclaration: (node) => {
    if (!isServiceClass(node) || accessOfClass(node) !== "read") {
      return;
    }

    if (writeSiteFrom(context.filename) !== null) {
      context.report({ message: READ_IO_MESSAGE, node: node.id });
    }
  },
}));

const serviceWired = rule((context) => ({
  ClassDeclaration: (node) => {
    if (isServiceClass(node) && serviceFileCountOf(node.id.name) < 2) {
      context.report({ message: WIRED_MESSAGE, node: node.id });
    }
  },
}));

const CORE_ERRORS = /^src\/shared\/actions\/_core\/errors\/(?<stem>[a-z0-9-]+)-(?:error|code)\.ts$/u;

const errorNameUnique = rule((context) => {
  const relative = relativeOf(context.filename);
  const core = CORE_ERRORS.exec(relative);

  return {
    ClassDeclaration: (node) => {
      if (relative.startsWith("src/server/") && node.id !== null && isWireErrorName(node.id.name)) {
        context.report({ message: ERROR_NAME_MESSAGE, node: node.id });
      }
    },
    Program: (node) => {
      if (core !== null && isDomainFolder(core.groups.stem)) {
        context.report({ message: CORE_ERROR_MESSAGE, node });
      }
    },
  };
});

const BAD_REQUEST = /^BadRequest(?:Error)?$/u;

const NOT_READY = /not ready/iu;

const isNotReadyLiteral = (node) => node.type === "Literal" && NOT_READY.test(String(node.value));

const isNotReadyTemplate = (node) =>
  node.type === "TemplateLiteral" && node.quasis.some((quasi) => NOT_READY.test(quasi.value.raw));

const isNotReadyText = (node) =>
  node !== null && (isNotReadyLiteral(node) || isNotReadyTemplate(node));

const firstText = (node) => {
  const [first = null] = node.arguments;

  if (first?.type === "ObjectExpression") {
    const message = first.properties.find((property) => property.key?.name === "message");

    return message?.value ?? null;
  }

  return first;
};

const notReadyUnavailable = rule((context) => ({
  NewExpression: (node) => {
    const isBadRequest = node.callee.type === "Identifier" && BAD_REQUEST.test(node.callee.name);

    if (isBadRequest && isNotReadyText(firstText(node))) {
      context.report({ message: NOT_READY_MESSAGE, node });
    }
  },
}));

const isInputMember = (node) =>
  node.type === "MemberExpression" && node.object.type === "Identifier" && node.object.name === "input";

const noInputDefault = rule((context) => ({
  LogicalExpression: (node) => {
    if (node.operator === "??" && isInputMember(node.left)) {
      context.report({ message: INPUT_DEFAULT_MESSAGE, node });
    }
  },
}));

const RUNTIME_GETTER = /^(?:directEditCall|[a-z][A-Za-z]*RuntimeOf|[a-z][A-Za-z]*[a-z]In|(?!studioCall$)[a-z][A-Za-z]*Call)$/u;

const importedName = (specifier) => specifier.imported?.name ?? specifier.local.name;

const noAdapterRuntimeCall = rule((context) => ({
  ImportDeclaration: (node) => {
    for (const specifier of node.specifiers) {
      if (RUNTIME_GETTER.test(importedName(specifier))) {
        context.report({ message: RUNTIME_CALL_MESSAGE, node: specifier });
      }
    }
  },
}));

export {
  errorNameUnique,
  noAdapterRuntimeCall,
  noInputDefault,
  notReadyUnavailable,
  readServiceIo,
  serviceWired,
};
