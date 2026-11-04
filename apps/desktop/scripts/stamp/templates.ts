import { pascal } from "../gen-common.js";
import { kebab } from "./names.js";
import type { DerivedNames } from "./names.js";

interface ImportLine {
  readonly from: string;
  readonly names: readonly string[];
  readonly typeOnly: boolean;
}

interface Field {
  readonly name: string;
  readonly schema: string;
}

interface ErrorRef {
  readonly name: string;
  readonly owner: "core" | "domain";
}

type AgentBinding =
  | {
      readonly lean: boolean;
      readonly name: string;
      readonly set: string;
      readonly short: string;
    }
  | { readonly off: string };

type McpBinding = { readonly name: string } | { readonly off: string };

interface ActionDefinitionSpec {
  readonly access: "read" | "edit" | "destructive";
  readonly agent: AgentBinding;
  readonly confirm: "none" | "user";
  readonly description: string;
  readonly errors: readonly ErrorRef[];
  readonly http: { readonly method: string; readonly path: string };
  readonly input: readonly Field[];
  readonly invalidates: readonly string[];
  readonly isList: boolean;
  readonly mcp: McpBinding;
  readonly names: DerivedNames;
  readonly needs: string;
  readonly output: readonly Field[];
  readonly scope: "project" | "org" | "device";
}

interface ActionHandlerSpec {
  readonly body: readonly string[] | null;
  readonly imports: readonly ImportLine[];
  readonly inputName: string;
  readonly names: DerivedNames;
  readonly preview: boolean;
}

interface ServiceSpec {
  readonly access: "read" | "write";
  readonly area: string;
  readonly className: string;
  readonly test: boolean;
}

interface ErrorSpec {
  readonly className: string;
  readonly fields: readonly Field[];
}

const SHARED = "@design-studio/actions";

const ID_SCHEMA = /\b(?<name>[A-Z]\w*IdSchema)\b/gu;

const text = (...rows: string[]): string => `${rows.join("\n")}\n`;

const quote = (value: string): string => JSON.stringify(value);

const renderImport = (line: ImportLine): string => {
  const names = [...line.names].toSorted().join(", ");

  if (line.typeOnly) {
    return `import type { ${names} } from "${line.from}";`;
  }

  return `import { ${names} } from "${line.from}";`;
};

const renderImports = (list: readonly ImportLine[]): string[] =>
  [...list]
    .toSorted(
      (left, right) =>
        Number(left.from > right.from) - Number(left.from < right.from)
    )
    .map((line) => renderImport(line));

const struct = (fields: readonly Field[], indent: string): string => {
  if (fields.length === 0) {
    return "Schema.Struct({})";
  }

  const rows = [...fields]
    .toSorted((left, right) => left.name.localeCompare(right.name))
    .map((field) => `${indent}  ${field.name}: ${field.schema},`);

  return ["Schema.Struct({", ...rows, `${indent}})`].join("\n");
};

const agentText = (agent: AgentBinding): string => {
  if ("off" in agent) {
    return `{ off: ${quote(agent.off)} }`;
  }

  return [
    "{",
    `    lean: ${String(agent.lean)},`,
    `    name: ${quote(agent.name)},`,
    `    set: ${quote(agent.set)},`,
    `    short: ${quote(agent.short)},`,
    "  }",
  ].join("\n");
};

const mcpText = (mcp: McpBinding): string => {
  if ("off" in mcp) {
    return `{ off: ${quote(mcp.off)} }`;
  }

  return `{ name: ${quote(mcp.name)} }`;
};

const errorImport = (error: ErrorRef): ImportLine => {
  let folder = "./errors";

  if (error.owner === "core") {
    folder = "../_core/errors";
  }

  return {
    from: `${folder}/${kebab(error.name)}.js`,
    names: [error.name],
    typeOnly: false,
  };
};

const idNames = (fields: readonly Field[]): string[] => [
  ...new Set(
    fields.flatMap((field) =>
      [...field.schema.matchAll(ID_SCHEMA)].map(
        (match) => match.groups?.["name"] ?? ""
      )
    )
  ),
];

const definitionImports = (spec: ActionDefinitionSpec): ImportLine[] => {
  const ids = idNames([...spec.input, ...spec.output]);

  const list: ImportLine[] = [
    { from: "../_core/action.js", names: ["defineAction"], typeOnly: false },
    ...spec.errors.map((error) => errorImport(error)),
  ];

  if (ids.length > 0) {
    list.push({ from: "../_core/ids.js", names: ids, typeOnly: false });
  }

  if (spec.isList) {
    list.push({
      from: "../_core/list-page.js",
      names: ["PageFields", "pageOf"],
      typeOnly: false,
    });
  }

  return list;
};

const listInput = (fields: readonly Field[]): string => {
  const rows = [...fields]
    .toSorted((left, right) => left.name.localeCompare(right.name))
    .map((field) => `    ${field.name}: ${field.schema},`);

  return ["Schema.Struct({", "    ...PageFields,", ...rows, "  })"].join("\n");
};

const inputText = (spec: ActionDefinitionSpec): string => {
  if (spec.isList) {
    return listInput(spec.input);
  }

  return struct(spec.input, "  ");
};

const outputText = (spec: ActionDefinitionSpec): string => {
  if (spec.isList) {
    return `pageOf(${struct(spec.output, "  ")})`;
  }

  return struct(spec.output, "  ");
};

const actionKeys = (spec: ActionDefinitionSpec): string[] => [
  `  access: ${quote(spec.access)},`,
  `  agent: ${agentText(spec.agent)},`,
  `  confirm: ${quote(spec.confirm)},`,
  `  description: ${quote(spec.description)},`,
  `  errors: [${spec.errors.map((error) => error.name).join(", ")}],`,
  `  http: { method: ${quote(spec.http.method)}, path: ${quote(spec.http.path)} },`,
  `  id: ${quote(spec.names.id)},`,
  `  input: ${inputText(spec)},`,
  `  invalidates: [${spec.invalidates.map((id) => quote(id)).join(", ")}],`,
  `  mcp: ${mcpText(spec.mcp)},`,
  `  needs: ${quote(spec.needs)},`,
  `  output: ${outputText(spec)},`,
  `  scope: ${quote(spec.scope)},`,
];

const actionDefinition = (spec: ActionDefinitionSpec): string =>
  text(
    `import { Schema } from "effect";`,
    "",
    ...renderImports(definitionImports(spec)),
    "",
    `const ${spec.names.constName} = defineAction({`,
    ...actionKeys(spec),
    "});",
    "",
    `export { ${spec.names.constName} };`
  );

const stubBody = (names: DerivedNames): string[] => {
  const message = quote(`${names.id} is not built yet.`);

  return [`  return yield* new NotImplemented({ message: ${message} });`];
};

const handlerTypes = (spec: ActionHandlerSpec): string[] => {
  if (spec.preview) {
    return ["Handle", "Preview"];
  }

  return ["Handle"];
};

const handlerImports = (spec: ActionHandlerSpec): ImportLine[] => {
  const { names } = spec;

  const list: ImportLine[] = [
    { from: `${SHARED}/_core/action.js`, names: ["Input"], typeOnly: true },
    {
      from: `${SHARED}/${names.domain}/${names.tail}.js`,
      names: [names.constName],
      typeOnly: true,
    },
    {
      from: "../_core/handler.js",
      names: handlerTypes(spec),
      typeOnly: true,
    },
    ...spec.imports,
  ];

  if (spec.body === null || spec.preview) {
    list.push({
      from: `${SHARED}/_core/errors/not-implemented.js`,
      names: ["NotImplemented"],
      typeOnly: false,
    });
  }

  return list;
};

const previewBlock = (spec: ActionHandlerSpec): string[] => {
  const { names } = spec;

  if (!spec.preview) {
    return [];
  }

  const label = quote(`${names.id}.preview`);

  return [
    "",
    `const preview = Effect.fn(${label})(function* card(`,
    `  ${spec.inputName}: ${names.inputType}`,
    ") {",
    ...stubBody(names),
    `}) satisfies Preview<typeof ${names.constName}>;`,
  ];
};

const actionHandler = (spec: ActionHandlerSpec): string => {
  const { names } = spec;
  let exported = "handle";

  if (spec.preview) {
    exported = "handle, preview";
  }

  return text(
    `import { Effect } from "effect";`,
    "",
    ...renderImports(handlerImports(spec)),
    "",
    `type ${names.inputType} = Input<typeof ${names.constName}>;`,
    "",
    `const handle = Effect.fn(${quote(names.id)})(function* run(`,
    `  ${spec.inputName}: ${names.inputType}`,
    ") {",
    ...(spec.body ?? stubBody(names)),
    `}) satisfies Handle<typeof ${names.constName}>;`,
    ...previewBlock(spec),
    "",
    `export { ${exported} };`
  );
};

const actionPreview = (names: DerivedNames, inputName: string): string => {
  const body = null;
  const imports: readonly ImportLine[] = [];
  const preview = true;

  return text(
    ...previewBlock({ body, imports, inputName, names, preview }).slice(1)
  );
};

const serviceTestLayer = (spec: ServiceSpec): string[] => {
  if (!spec.test) {
    return [];
  }

  return [
    "",
    `  public static readonly layerTest = Layer.succeed(`,
    `    ${spec.className},`,
    `    ${spec.className}.of({ now: () => Effect.succeed(0) })`,
    "  );",
  ];
};

const service = (spec: ServiceSpec): string => {
  const name = spec.className;
  const key = quote(`design-studio/${spec.area}/${name}`);
  const label = quote(`${name}.now`);

  return text(
    `import { Clock, Context, Effect, Layer } from "effect";`,
    "",
    `interface ${name}Api {`,
    "  readonly now: () => Effect.Effect<number>;",
    "}",
    "",
    `class ${name} extends Context.Service<${name}, ${name}Api>()(`,
    `  ${key}`,
    ") {",
    `  declare public readonly access: ${quote(spec.access)};`,
    "",
    "  public static readonly layer = Layer.effect(",
    `    ${name},`,
    "    Effect.gen(function* make() {",
    "      const clock = yield* Clock.Clock;",
    "",
    `      const now = Effect.fn(${label})(function* run() {`,
    "        return yield* clock.currentTimeMillis;",
    "      });",
    "",
    `      return ${name}.of({ now });`,
    "    })",
    "  );",
    ...serviceTestLayer(spec),
    "}",
    "",
    `export { ${name} };`,
    "",
    `export type { ${name}Api };`
  );
};

const errorClass = (spec: ErrorSpec): string => {
  const name = spec.className;
  const fields = [{ name: "message", schema: "Schema.String" }, ...spec.fields];

  return text(
    `import { Schema } from "effect";`,
    "",
    `class ${name} extends Schema.TaggedError<${name}>()(${quote(name)}, {`,
    ...fields.map((field) => `  ${field.name}: ${field.schema},`),
    "}) {}",
    "",
    `export { ${name} };`
  );
};

const errorStatusRow = (className: string, status: number): string =>
  `  ${className}: ${String(status)},`;

const domainSchema = (): string => text("export {};");

const domainStatus = (domain: string): string => {
  const name = pascal(domain);

  return text(
    `import type { HttpStatus } from "../../_core/errors/http-status-codes.js";`,
    `import type { ${name}ErrorTag } from "./index.js";`,
    "",
    `const ${name}Status = {} as const satisfies Record<${name}ErrorTag, HttpStatus>;`,
    "",
    `export { ${name}Status };`
  );
};

const domainLive = (domain: string): string => {
  const name = `${pascal(domain)}Live`;

  return text(
    `import { Layer } from "effect";`,
    "",
    `const ${name} = Layer.empty;`,
    "",
    `export { ${name} };`
  );
};

export {
  uiComponent,
  uiCopy,
  uiFeatureIndex,
  uiHook,
  uiModel,
} from "./templates-ui.js";

export type { CopyEntry, UiHookSpec } from "./templates-ui.js";

export {
  actionDefinition,
  actionHandler,
  actionPreview,
  domainLive,
  domainSchema,
  domainStatus,
  errorClass as error,
  errorStatusRow,
  service,
};

export type {
  ActionDefinitionSpec,
  ActionHandlerSpec,
  AgentBinding,
  ErrorRef,
  ErrorSpec,
  Field,
  ImportLine,
  McpBinding,
  ServiceSpec,
};
