import { readFile } from "node:fs/promises";

import type { BabelFile } from "./babel-types.js";
import {
  componentSchema,
  cvaCalls,
  declaredComponents,
  listComponents,
  parseModuleFile,
  resolveSource,
} from "./deps.js";
import type {
  ComponentVariantTarget,
  CvaCall,
  Direction,
  Project,
} from "./deps.js";
import { ComponentVariantError } from "./errors.js";

interface VariantScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

interface SourceFile {
  readonly file: string;
  readonly relative: string;
}

type SchemaRead = Awaited<ReturnType<typeof componentSchema>>;

interface LocatedCva {
  readonly ast: BabelFile;
  readonly call: CvaCall;
  readonly code: string;
  readonly name: string | null;
  readonly source: SourceFile;
}

const refuse = (message: string): never => {
  throw new ComponentVariantError(message);
};

const fileOfName = async (
  scope: VariantScope,
  name: string
): Promise<string> => {
  const listed = await listComponents(scope.workTree, scope.project.kind);

  const files = [
    ...new Set(
      listed.flatMap((entry) => {
        if (entry.name !== name || entry.source !== "react" || !entry.file) {
          return [];
        }

        return [entry.file];
      })
    ),
  ];

  if (files.length === 0) {
    return refuse(
      `The project has no kit component named ${name}. Use list_components.`
    );
  }

  if (files.length > 1) {
    return refuse(
      `More than one component is named ${name} (${files.join(", ")}). Pass its file too.`
    );
  }

  return files[0] ?? "";
};

const schemaOf = async (
  scope: VariantScope,
  source: SourceFile,
  name: string | null
): Promise<SchemaRead> => {
  if (!name) {
    return null;
  }

  try {
    return await componentSchema(scope.workTree, { file: source.file, name });
  } catch {
    return null;
  }
};

const callNames = (calls: readonly CvaCall[]): string =>
  calls.map((call) => call.info.name).join(", ");

const byName = (calls: readonly CvaCall[], wanted: string): CvaCall => {
  const found = calls.find((call) => call.info.name === wanted);

  if (!found) {
    return refuse(
      `The file has no cva() named ${wanted}. It has: ${callNames(calls)}.`
    );
  }

  return found;
};

const byComponent = (
  calls: readonly CvaCall[],
  name: string | null
): CvaCall | null => {
  if (!name) {
    return null;
  }

  const lower = name.toLowerCase();

  return (
    calls.find((call) => call.info.name.toLowerCase().startsWith(lower)) ?? null
  );
};

const pickCall = (
  calls: readonly CvaCall[],
  wanted: string | null,
  name: string | null
): CvaCall => {
  if (wanted) {
    return byName(calls, wanted);
  }

  const [only] = calls;

  if (calls.length === 1 && only) {
    return only;
  }

  return (
    byComponent(calls, name) ??
    refuse(
      `The file has more than one cva(): ${callNames(calls)}. Pass cva with the name.`
    )
  );
};

const componentOfCall = (
  ast: BabelFile,
  code: string,
  call: CvaCall
): string | null => {
  const used = new RegExp(`\\b${call.info.name}\\s*\\(`, "u");

  const found = declaredComponents(ast).find((declared) =>
    used.test(code.slice(declared.start, declared.end))
  );

  return found?.name ?? null;
};

const sourceOf = async (
  scope: VariantScope,
  target: ComponentVariantTarget
): Promise<SourceFile> => {
  if (target.file) {
    return resolveSource(scope.workTree, target.file);
  }

  if (!target.name) {
    return refuse("Pass the component name or its file.");
  }

  return resolveSource(scope.workTree, await fileOfName(scope, target.name));
};

const followed = (
  scope: VariantScope,
  source: SourceFile,
  relative: string | null
): Promise<SourceFile> => {
  if (!relative || relative === source.relative) {
    return Promise.resolve(source);
  }

  return resolveSource(scope.workTree, relative);
};

const locateCva = async (
  scope: VariantScope,
  target: ComponentVariantTarget
): Promise<LocatedCva> => {
  const first = await sourceOf(scope, target);
  const schema = await schemaOf(scope, first, target.name);
  const sourceFile = await followed(scope, first, schema?.file ?? null);
  const code = await readFile(sourceFile.file, "utf-8");

  const ast =
    parseModuleFile(code, sourceFile.file) ??
    refuse(`${sourceFile.relative} does not parse.`);

  const calls = cvaCalls(ast);

  if (calls.length === 0) {
    return refuse(
      `${sourceFile.relative} has no cva() variants. Only cva components take variants.`
    );
  }

  const call = pickCall(
    calls,
    target.cva ?? schema?.cva?.name ?? null,
    target.name
  );

  return {
    ast,
    call,
    code,
    name: schema?.name ?? target.name ?? componentOfCall(ast, code, call),
    source: sourceFile,
  };
};

export { locateCva };

export type { LocatedCva, SourceFile, VariantScope };
