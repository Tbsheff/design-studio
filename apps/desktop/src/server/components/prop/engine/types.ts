import type {
  ArrowFunctionExpression,
  File as BabelFile,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  ObjectPattern,
  ObjectProperty,
  RestElement,
  TSInterfaceBody,
  TSPropertySignature,
  TSType,
  TSTypeLiteral,
} from "@babel/types";

interface Splice {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

interface Refusal {
  readonly code: "bad_request" | "conflict" | "not_found";
  readonly message: string;
  readonly ok: false;
}

interface Planned<Value> {
  readonly ok: true;
  readonly value: Value;
}

type Outcome<Value> = Planned<Value> | Refusal;

type FunctionNode =
  | ArrowFunctionExpression
  | FunctionDeclaration
  | FunctionExpression;

type TypeBody = TSInterfaceBody | TSTypeLiteral;

interface Member {
  readonly host: TypeBody;
  readonly isOptional: boolean;
  readonly name: string;
  readonly node: TSPropertySignature;
  readonly typeText: string;
}

interface TypeHost {
  readonly annotationAt: number | null;
  readonly insertInto: TypeBody | null;
  readonly isExternal: boolean;
  readonly members: readonly Member[];
  readonly wrap: TSType | null;
}

interface PropEntry {
  readonly defaultNode: Expression | null;
  readonly isShorthand: boolean;
  readonly local: string | null;
  readonly name: string;
  readonly property: ObjectProperty;
}

interface ComponentModel {
  readonly ast: BabelFile;
  readonly code: string;
  readonly entries: readonly PropEntry[];
  readonly fn: FunctionNode;
  readonly host: TypeHost;
  readonly isTyped: boolean;
  readonly name: string;
  readonly pattern: ObjectPattern;
  readonly rest: RestElement | null;
}

const toRefusal = (code: Refusal["code"], message: string): Refusal => ({
  code,
  message,
  ok: false,
});

const toPlanned = <Value>(value: Value): Planned<Value> => ({
  ok: true,
  value,
});

export { toPlanned, toRefusal };

export type {
  ComponentModel,
  FunctionNode,
  Member,
  Outcome,
  Planned,
  PropEntry,
  Refusal,
  Splice,
  TypeBody,
  TypeHost,
};
