import type { Dirent } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface GeneratedFile {
  path: string;
  text: string;
}

const ROOT = path.join(import.meta.dirname, "..");

const CONTRACT = path.join(ROOT, "src/shared/contract");

const SERVICES = path.join(ROOT, "src/server/services");

const HEADER = "// @generated";

const CORE = "_core";

const CLOSE_CONST = "} as const;";

const pascal = (ctx: string): string =>
  ctx
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const camel = (ctx: string): string => {
  const name = pascal(ctx);

  return name.charAt(0).toLowerCase() + name.slice(1);
};

const lines = (...body: string[]): string =>
  `${[HEADER, ...body].join("\n")}\n`;

const stub = (name: string): string =>
  lines(`const ${name} = {} as const;`, "", `export { ${name} };`);

const readOrEmpty = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const listDir = async (dir: string): Promise<Dirent[]> => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

const CONTRACT_SKIP = new Set(["index", "routes", "schema"]);

const SERVICE_SKIP = new Set(["handlers", "live"]);

const opTails = async (
  dir: string,
  skip: ReadonlySet<string>
): Promise<string[]> => {
  const entries = await listDir(dir);

  const tails: string[] = [];

  for (const entry of entries) {
    const tail = entry.name.replace(/\.ts$/u, "");

    const isOp =
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !skip.has(tail);

    if (isOp) {
      tails.push(tail);
    }
  }

  return tails.toSorted((left, right) => left.localeCompare(right));
};

const opsIndex = (ctx: string, tails: string[]): string => {
  const name = `${pascal(ctx)}Ops`;

  if (tails.length === 0) {
    return stub(name);
  }

  return lines(
    ...tails.map((tail) => `import { ${camel(tail)} } from "./${tail}.js";`),
    "",
    `const ${name} = {`,
    ...tails.map((tail) => `  ${camel(tail)},`),
    CLOSE_CONST,
    "",
    `export { ${name} };`
  );
};

const PREVIEW_EXPORT = /export\s*\{[^}]*\bpreview\b[^}]*\}/u;

const hasPreview = async (ctx: string, tail: string): Promise<boolean> =>
  PREVIEW_EXPORT.test(
    await readOrEmpty(path.join(SERVICES, ctx, `${tail}.ts`))
  );

const entryImport = (tail: string, preview: boolean): string => {
  const key = camel(tail);

  const names = preview
    ? `handle as ${key}Handle, preview as ${key}Preview`
    : `handle as ${key}Handle`;

  return `import { ${names} } from "./${tail}.js";`;
};

const entryRow = (tail: string, preview: boolean): string => {
  const key = camel(tail);

  return preview
    ? `  ${key}: { handle: ${key}Handle, preview: ${key}Preview },`
    : `  ${key}: { handle: ${key}Handle },`;
};

const handlersFile = async (ctx: string, tails: string[]): Promise<string> => {
  const name = `${pascal(ctx)}Entries`;

  if (tails.length === 0) {
    return stub(name);
  }

  const previews = await Promise.all(
    tails.map((tail) => hasPreview(ctx, tail))
  );

  return lines(
    `import type { ${pascal(ctx)}Ops } from "../../../shared/contract/${ctx}/index.js";`,
    `import type { Entries } from "../_core/handler.js";`,
    ...tails.map((tail, index) => entryImport(tail, Boolean(previews[index]))),
    "",
    `const ${name} = {`,
    ...tails.map((tail, index) => entryRow(tail, Boolean(previews[index]))),
    `} satisfies Entries<typeof ${pascal(ctx)}Ops>;`,
    "",
    `export { ${name} };`
  );
};

interface RouteOp {
  readonly http: { readonly method: string; readonly path: string };
  readonly id: string;
  readonly invalidates: readonly string[];
}

const loadRoute = async (ctx: string, tail: string): Promise<RouteOp> => {
  const file = path.join(CONTRACT, ctx, `${tail}.ts`);

  try {
    const mod = (await import(pathToFileURL(file).href)) as Record<
      string,
      RouteOp
    >;

    const op = mod[camel(tail)];

    if (!op) {
      throw new Error(`no export named ${camel(tail)}`);
    }

    return op;
  } catch (error) {
    throw new Error(
      `gen-routes: cannot load ${path.relative(ROOT, file)} for routes.ts (${String(error)}). fix: export one defineOp const named ${camel(tail)}`,
      { cause: error }
    );
  }
};

const routeRows = (tail: string, op: RouteOp): string[] => [
  `  ${camel(tail)}: {`,
  `    id: ${JSON.stringify(op.id)},`,
  `    invalidates: ${JSON.stringify(op.invalidates).replaceAll(",", ", ")},`,
  `    method: ${JSON.stringify(op.http.method)},`,
  `    path: ${JSON.stringify(op.http.path)},`,
  "  },",
];

const routesFile = async (ctx: string, tails: string[]): Promise<string> => {
  if (tails.length === 0) {
    return stub("routes");
  }

  const ops = await Promise.all(tails.map((tail) => loadRoute(ctx, tail)));

  return lines(
    "const routes = {",
    ...tails.flatMap((tail, index) => {
      const op = ops[index];

      return op ? routeRows(tail, op) : [];
    }),
    CLOSE_CONST,
    "",
    "export { routes };"
  );
};

interface ContextScan {
  readonly ctx: string;
  readonly ops: string[];
  readonly services: string[];
}

const scanContext = async (ctx: string): Promise<ContextScan> => ({
  ctx,
  ops: await opTails(path.join(CONTRACT, ctx), CONTRACT_SKIP),
  services: await opTails(path.join(SERVICES, ctx), SERVICE_SKIP),
});

const contextFiles = async (scan: ContextScan): Promise<GeneratedFile[]> => [
  {
    path: path.join(CONTRACT, scan.ctx, "index.ts"),
    text: opsIndex(scan.ctx, scan.ops),
  },
  {
    path: path.join(CONTRACT, scan.ctx, "routes.ts"),
    text: await routesFile(scan.ctx, scan.ops),
  },
  {
    path: path.join(SERVICES, scan.ctx, "handlers.ts"),
    text: await handlersFile(scan.ctx, scan.services),
  },
];

const missingFrom = (
  from: string[],
  other: string[],
  folder: string
): string[] =>
  from.flatMap((tail) =>
    other.includes(tail)
      ? []
      : [
          `gen-routes: ${folder}/${tail}.ts has no pair file. fix: add the matching op and handler files, or remove this one`,
        ]
  );

const pairErrors = (scan: ContextScan): string[] => [
  ...missingFrom(scan.ops, scan.services, `src/shared/contract/${scan.ctx}`),
  ...missingFrom(scan.services, scan.ops, `src/server/services/${scan.ctx}`),
];

const EXPORT_LIST = /\bexport\s+(?:type\s+)?\{(?<names>[^}]*)\}/gu;

const EXPORT_DECL =
  /\bexport\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+(?<name>[\w$]+)/gu;

const EXPORT_OTHER = /\bexport\s+(?<name>default|\*)/gu;

const listedNames = (names: string): string[] =>
  names
    .split(",")
    .map(
      (part) =>
        part
          .trim()
          .replace(/^type /u, "")
          .split(" as ")
          .at(-1)
          ?.trim() ?? ""
    )
    .filter((name) => name !== "");

const exportNames = (text: string): string[] => [
  ...[...text.matchAll(EXPORT_LIST)].flatMap((match) =>
    listedNames(match.groups?.["names"] ?? "")
  ),
  ...[...text.matchAll(EXPORT_DECL), ...text.matchAll(EXPORT_OTHER)].map(
    (match) => match.groups?.["name"] ?? ""
  ),
];

const sameNames = (found: string[], allowed: string[]): boolean =>
  found.every((name) => allowed.includes(name));

const opExportError = async (ctx: string, tail: string): Promise<string[]> => {
  const file = `src/shared/contract/${ctx}/${tail}.ts`;
  const text = await readOrEmpty(path.join(ROOT, file));
  const name = camel(tail);
  const found = exportNames(text);

  const defined = new RegExp(`\\bconst\\s+${name}\\s*=\\s*defineOp\\(`, "u");

  if (found.length === 1 && found[0] === name && defined.test(text)) {
    return [];
  }

  return [
    `gen-routes: ${file} is not one defineOp const named ${name} (exports: ${found.join(", ") || "nothing"}). fix: export only one defineOp const named ${name}`,
  ];
};

const serviceExportError = async (
  ctx: string,
  tail: string
): Promise<string[]> => {
  const file = `src/server/services/${ctx}/${tail}.ts`;
  const found = exportNames(await readOrEmpty(path.join(ROOT, file)));

  if (found.includes("handle") && sameNames(found, ["handle", "preview"])) {
    return [];
  }

  return [
    `gen-routes: ${file} exports ${found.join(", ") || "nothing"}. fix: export only handle and preview`,
  ];
};

const exportErrors = async (scan: ContextScan): Promise<string[]> => {
  const found = await Promise.all([
    ...scan.ops.map((tail) => opExportError(scan.ctx, tail)),
    ...scan.services.map((tail) => serviceExportError(scan.ctx, tail)),
  ]);

  return found.flat();
};

interface ListSpec {
  suffix: string;
  file: string;
  constName: string;
}

const globalList = (contexts: string[], spec: ListSpec): string =>
  lines(
    ...contexts.map(
      (ctx) =>
        `import { ${pascal(ctx)}${spec.suffix} } from "./${ctx}/${spec.file}";`
    ),
    "",
    `const ${spec.constName} = {`,
    ...contexts.map((ctx) => `  ${camel(ctx)}: ${pascal(ctx)}${spec.suffix},`),
    CLOSE_CONST,
    "",
    `export { ${spec.constName} };`
  );

const liveContexts = async (contexts: string[]): Promise<string[]> => {
  const found = await Promise.all(
    contexts.map((ctx) => readOrEmpty(path.join(SERVICES, ctx, "live.ts")))
  );

  return contexts.filter((_ctx, index) => Boolean(found[index]));
};

const globalFiles = async (contexts: string[]): Promise<GeneratedFile[]> => {
  const live = await liveContexts(contexts);

  const files: GeneratedFile[] = [
    {
      path: path.join(CONTRACT, "all-ops.generated.ts"),
      text: globalList(contexts, {
        constName: "ALL_OPS",
        file: "index.js",
        suffix: "Ops",
      }),
    },
    {
      path: path.join(SERVICES, "all-entries.generated.ts"),
      text: globalList(contexts, {
        constName: "ALL_ENTRIES",
        file: "handlers.js",
        suffix: "Entries",
      }),
    },
  ];

  if (live.length > 0) {
    files.push({
      path: path.join(SERVICES, "all-live.generated.ts"),
      text: globalList(live, {
        constName: "ALL_LIVE",
        file: "live.js",
        suffix: "Live",
      }),
    });
  }

  return files;
};

const scanContexts = async (): Promise<string[]> => {
  const entries = await readdir(CONTRACT, { withFileTypes: true });

  const names: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== CORE) {
      names.push(entry.name);
    }
  }

  return names.toSorted((left, right) => left.localeCompare(right));
};

interface Build {
  readonly errors: string[];
  readonly files: GeneratedFile[];
}

const buildAll = async (): Promise<Build> => {
  const contexts = await scanContexts();
  const scans = await Promise.all(contexts.map((ctx) => scanContext(ctx)));
  const exported = await Promise.all(scans.map((scan) => exportErrors(scan)));

  const errors = [
    ...scans.flatMap((scan) => pairErrors(scan)),
    ...exported.flat(),
  ];

  if (errors.length > 0) {
    return { errors, files: [] };
  }

  const perContext = await Promise.all(scans.map((scan) => contextFiles(scan)));

  const files = [...perContext.flat(), ...(await globalFiles(contexts))];

  return {
    errors,
    files: files.toSorted((left, right) => left.path.localeCompare(right.path)),
  };
};

const staleFiles = async (files: GeneratedFile[]): Promise<string[]> => {
  const current = await Promise.all(
    files.map((file) => readOrEmpty(file.path))
  );

  const stale: string[] = [];

  for (const [index, file] of files.entries()) {
    if (current[index] !== file.text) {
      stale.push(path.relative(ROOT, file.path));
    }
  }

  return stale;
};

const writeAll = async (files: GeneratedFile[]): Promise<void> => {
  await Promise.all(
    files.map(async (file) => {
      await mkdir(path.dirname(file.path), { recursive: true });
      await writeFile(file.path, file.text);
    })
  );
};

const check = async (files: GeneratedFile[]): Promise<void> => {
  const stale = await staleFiles(files);

  for (const file of stale) {
    process.stderr.write(
      `gen-routes: ${file} is stale or edited by hand. fix: pnpm exec tsx scripts/gen-routes.ts\n`
    );
  }

  if (stale.length > 0) {
    process.exitCode = 1;
  }
};

const { errors, files } = await buildAll();

for (const error of errors) {
  process.stderr.write(`${error}\n`);
}

if (errors.length > 0) {
  process.exitCode = 1;
} else if (process.argv.includes("--check")) {
  await check(files);
} else {
  await writeAll(files);
  process.stdout.write(`gen-routes: wrote ${files.length} files\n`);
}
