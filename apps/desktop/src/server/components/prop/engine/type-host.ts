import type {
  File as BabelFile,
  Node as BabelNode,
  Statement,
  TSInterfaceDeclaration,
  TSPropertySignature,
  TSType,
  TSTypeAliasDeclaration,
  TSTypeReference,
} from "@babel/types";

import { toEnd, toStart } from "./ast.js";
import type { Member, TypeBody, TypeHost } from "./types.js";

type LocalType = TSInterfaceDeclaration | TSTypeAliasDeclaration;

interface HostContext {
  readonly code: string;
  readonly locals: ReadonlyMap<string, LocalType>;
}

const MAX_DEPTH = 5;

const EMPTY_HOST: TypeHost = {
  annotationAt: null,
  insertInto: null,
  isExternal: false,
  members: [],
  wrap: null,
};

const toKeyName = (key: TSPropertySignature["key"]): string | null => {
  if (key.type === "Identifier") {
    return key.name;
  }

  if (key.type === "StringLiteral") {
    return key.value;
  }

  return null;
};

const toTypeText = (code: string, node: BabelNode | null): string => {
  if (node === null) {
    return "";
  }

  return code.slice(toStart(node), toEnd(node)).replaceAll(/\s+/gu, " ");
};

const toSignatures = (body: TypeBody): readonly BabelNode[] => {
  if (body.type === "TSTypeLiteral") {
    return body.members;
  }

  return body.body;
};

const toMember = (
  code: string,
  host: TypeBody,
  node: TSPropertySignature
): Member[] => {
  const name = toKeyName(node.key);

  if (name === null || node.computed === true) {
    return [];
  }

  const isOptional = node.optional === true;
  const annotation = node.typeAnnotation?.typeAnnotation ?? null;
  const typeText = toTypeText(code, annotation);

  return [{ host, isOptional, name, node, typeText }];
};

const toMembers = (code: string, body: TypeBody): Member[] => {
  const nodes = toSignatures(body).filter(
    (node): node is TSPropertySignature => node.type === "TSPropertySignature"
  );

  return nodes.flatMap((node) => toMember(code, body, node));
};

const toDeclared = (statement: Statement): BabelNode | null => {
  if (statement.type === "ExportNamedDeclaration") {
    return statement.declaration ?? null;
  }

  return statement;
};

const toLocalTypes = (ast: BabelFile): Map<string, LocalType> => {
  const out = new Map<string, LocalType>();

  for (const statement of ast.program.body) {
    const declared = toDeclared(statement);

    if (
      declared?.type === "TSInterfaceDeclaration" ||
      declared?.type === "TSTypeAliasDeclaration"
    ) {
      out.set(declared.id.name, declared);
    }
  }

  return out;
};

const toExternal = (node: TSType): TypeHost => ({
  annotationAt: null,
  insertInto: null,
  isExternal: true,
  members: [],
  wrap: node,
});

const toMergedHost = (
  hosts: readonly TypeHost[],
  fallback: TSType
): TypeHost => {
  const insertInto =
    hosts.find((host) => host.insertInto !== null)?.insertInto ?? null;

  const isExternal = hosts.some((host) => host.isExternal);
  const members = hosts.flatMap((host) => host.members);

  const annotationAt = null;
  const wrap = hosts.find((host) => host.wrap !== null)?.wrap ?? fallback;

  return { annotationAt, insertInto, isExternal, members, wrap };
};

const toBodyHost = (
  context: HostContext,
  body: TypeBody,
  isExternal: boolean
): TypeHost => {
  const annotationAt = null;
  const insertInto = body;
  const members = toMembers(context.code, body);
  const wrap = null;

  return { annotationAt, insertInto, isExternal, members, wrap };
};

const toLocalReference = (
  context: HostContext,
  node: TSTypeReference
): LocalType | null => {
  if (node.typeName.type !== "Identifier") {
    return null;
  }

  return context.locals.get(node.typeName.name) ?? null;
};

type Recurse = (context: HostContext, node: TSType, depth: number) => TypeHost;

const toReferenceHost = (
  context: HostContext,
  node: TSTypeReference,
  depth: number,
  recurse: Recurse
): TypeHost => {
  const local = toLocalReference(context, node);

  if (!local || node.typeParameters) {
    return toExternal(node);
  }

  if (local.type === "TSInterfaceDeclaration") {
    return toBodyHost(context, local.body, (local.extends ?? []).length > 0);
  }

  return recurse(context, local.typeAnnotation, depth + 1);
};

const toTypeHost = (
  context: HostContext,
  node: TSType,
  depth: number
): TypeHost => {
  if (depth > MAX_DEPTH) {
    return toExternal(node);
  }

  if (node.type === "TSTypeLiteral") {
    return toBodyHost(context, node, false);
  }

  if (node.type === "TSTypeReference") {
    return toReferenceHost(context, node, depth, toTypeHost);
  }

  if (node.type === "TSIntersectionType") {
    return toMergedHost(
      node.types.map((part) => toTypeHost(context, part, depth + 1)),
      node
    );
  }

  return toExternal(node);
};

export { EMPTY_HOST, toLocalTypes, toTypeHost, toTypeText };

export type { HostContext };
