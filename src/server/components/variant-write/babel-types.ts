import type { CvaCall, parseModuleFile } from "./deps.js";

type CallExpression = CvaCall["node"];

type CallArgument = CallExpression["arguments"][number];

type ObjectExpression = Extract<CallArgument, { type: "ObjectExpression" }>;

type ArrayExpression = Extract<CallArgument, { type: "ArrayExpression" }>;

type ObjectMember = ObjectExpression["properties"][number];

type ObjectProperty = Extract<ObjectMember, { type: "ObjectProperty" }>;

type BabelNode =
  | CallArgument
  | ObjectMember
  | ObjectProperty["key"]
  | ObjectProperty["value"]
  | NonNullable<ArrayExpression["elements"][number]>;

type BabelFile = NonNullable<ReturnType<typeof parseModuleFile>>;

export type {
  ArrayExpression,
  BabelFile,
  BabelNode,
  CallExpression,
  ObjectExpression,
  ObjectProperty,
};
