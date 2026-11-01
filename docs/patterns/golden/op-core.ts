import type { Schema } from "effect";

import type { ConfirmPermission, Permission } from "./permissions.js";

type Access = "destructive" | "edit" | "read";

type Method = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

type OffReason = "run-control" | "secret" | "stream" | "ui-bootstrap";

type Scope = "device" | "org" | "project";

type ToolSet = "app" | "core" | "design-system" | "kit" | "tweak";

type Fields = Readonly<
  Record<string, Schema.Codec<unknown, unknown, never, never>>
>;

type OpId = `${string}.${string}`;

interface NamedBinding {
  readonly name: string;
}

interface AgentBinding {
  readonly lean: boolean;
  readonly name: string;
  readonly set: ToolSet;
  readonly short: string;
}

interface OffBinding {
  readonly off: OffReason;
}

type ErrorClass = new (...args: never[]) => {
  readonly _tag: string;
  readonly message: string;
};

interface OpSpec<
  Id extends OpId,
  Path extends `/api/${string}`,
  In extends Schema.Struct<Fields>,
  Out extends Schema.Struct<Fields>,
  Errs extends readonly ErrorClass[],
> {
  readonly access: Access;
  readonly agent: AgentBinding | OffBinding;
  readonly confirm: "none" | "user";
  readonly description: string;
  readonly errors: Errs;
  readonly http: { readonly method: Method; readonly path: Path };
  readonly id: Id;
  readonly input: In;
  readonly invalidates: readonly OpId[];
  readonly mcp: NamedBinding | OffBinding;
  readonly needs: Permission;
  readonly output: Out;
  readonly scope: Scope;
}

type AnyOp = OpSpec<
  OpId,
  `/api/${string}`,
  Schema.Struct<Fields>,
  Schema.Struct<Fields>,
  readonly ErrorClass[]
>;

type PathParams<Path extends string> =
  Path extends `${string}:${infer Key}/${infer Rest}`
    ? Key | PathParams<`/${Rest}`>
    : Path extends `${string}:${infer Key}`
      ? Key
      : never;

type MissingParams<
  Path extends string,
  In extends Schema.Struct<Fields>,
> = Exclude<PathParams<Path>, keyof In["Type"]>;

type TextParams<
  Path extends string,
  In extends Schema.Struct<Fields>,
> = PathParams<Path> & keyof In["Encoded"];

type NonTextParams<Path extends string, In extends Schema.Struct<Fields>> = {
  readonly [Key in TextParams<Path, In>]: In["Encoded"][Key] extends string
    ? never
    : Key;
}[TextParams<Path, In>];

type ParamCheck<Path extends string, In extends Schema.Struct<Fields>> = [
  MissingParams<Path, In>,
] extends [never]
  ? [NonTextParams<Path, In>] extends [never]
    ? unknown
    : { readonly pathParamNotString: NonTextParams<Path, In> }
  : { readonly missingPathParam: MissingParams<Path, In> };

type ScopeCheck<Spec> = Spec extends { readonly scope: "project" }
  ? Spec extends {
      readonly input: { readonly Type: { readonly projectId: string } };
    }
    ? unknown
    : { readonly projectScopeNeedsProjectId: true }
  : unknown;

type ReadCheck<Spec> = Spec extends { readonly access: "read" }
  ? Spec extends { readonly http: { readonly method: "GET" } }
    ? unknown
    : { readonly readOpNeedsGet: true }
  : unknown;

type ConfirmCheck<Spec> = Spec extends
  | { readonly access: "destructive" }
  | { readonly needs: ConfirmPermission }
  ? Spec extends { readonly confirm: "user" }
    ? unknown
    : { readonly opNeedsConfirmUser: true }
  : unknown;

type Input<Op extends AnyOp> = Op["input"]["Type"];

type Output<Op extends AnyOp> = Op["output"]["Type"];

type ErrorOf<Op extends AnyOp> = InstanceType<Op["errors"][number]>;

type WireInput<Op extends AnyOp> = Op["input"]["Encoded"];

type WireOutput<Op extends AnyOp> = Op["output"]["Encoded"];

const defineOp = <
  const Id extends OpId,
  const Path extends `/api/${string}`,
  In extends Schema.Struct<Fields>,
  Out extends Schema.Struct<Fields>,
  const Errs extends readonly ErrorClass[],
  const Spec extends OpSpec<Id, Path, In, Out, Errs>,
>(
  spec: Spec &
    OpSpec<Id, Path, In, Out, Errs> &
    ParamCheck<Path, In> &
    ScopeCheck<Spec> &
    ReadCheck<Spec> &
    ConfirmCheck<Spec>
): Spec => spec;

export { defineOp };

export type {
  Access,
  AgentBinding,
  AnyOp,
  ErrorClass,
  ErrorOf,
  Input,
  Method,
  OffReason,
  OpId,
  Output,
  PathParams,
  ToolSet,
  WireInput,
  WireOutput,
};
