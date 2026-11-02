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

type ActionId = `${string}.${string}`;

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

interface ActionSpec<
  Id extends ActionId,
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
  readonly invalidates: readonly ActionId[];
  readonly mcp: NamedBinding | OffBinding;
  readonly needs: Permission;
  readonly output: Out;
  readonly scope: Scope;
}

type AnyAction = ActionSpec<
  ActionId,
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
    : { readonly readActionNeedsGet: true }
  : unknown;

type ConfirmCheck<Spec> = Spec extends
  | { readonly access: "destructive" }
  | { readonly needs: ConfirmPermission }
  ? Spec extends { readonly confirm: "user" }
    ? unknown
    : { readonly actionNeedsConfirmUser: true }
  : unknown;

type Input<Action extends AnyAction> = Action["input"]["Type"];

type Output<Action extends AnyAction> = Action["output"]["Type"];

type ErrorOf<Action extends AnyAction> = InstanceType<Action["errors"][number]>;

type WireInput<Action extends AnyAction> = Action["input"]["Encoded"];

type WireOutput<Action extends AnyAction> = Action["output"]["Encoded"];

const defineAction = <
  const Id extends ActionId,
  const Path extends `/api/${string}`,
  In extends Schema.Struct<Fields>,
  Out extends Schema.Struct<Fields>,
  const Errs extends readonly ErrorClass[],
  const Spec extends ActionSpec<Id, Path, In, Out, Errs>,
>(
  spec: Spec &
    ActionSpec<Id, Path, In, Out, Errs> &
    ParamCheck<Path, In> &
    ScopeCheck<Spec> &
    ReadCheck<Spec> &
    ConfirmCheck<Spec>
): Spec => spec;

export { defineAction };

export type {
  Access,
  ActionId,
  ActionSpec,
  AgentBinding,
  AnyAction,
  ConfirmCheck,
  ErrorClass,
  ErrorOf,
  Fields,
  Input,
  Method,
  NamedBinding,
  OffBinding,
  OffReason,
  Output,
  ParamCheck,
  PathParams,
  ReadCheck,
  Scope,
  ScopeCheck,
  ToolSet,
  WireInput,
  WireOutput,
};
