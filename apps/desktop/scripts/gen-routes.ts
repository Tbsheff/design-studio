import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ACTIONS,
  CLOSE_CONST,
  CORE,
  HANDLERS,
  ROOT,
  actionConst,
  actionTails,
  lines,
  pascal,
  camel,
  formatFile,
  readOrEmpty,
  stub,
} from "./gen-common.js";
import type { GeneratedFile } from "./gen-common.js";
import { errorFiles } from "./gen-errors.js";
import { toExportFiles } from "./gen-exports.js";

const ACTION_SKIP = new Set(["index", "routes", "schema"]);
const HANDLER_SKIP = new Set(["handlers", "live"]);

const actionsIndex = (ctx: string, tails: string[]): string => {
  const name = `${pascal(ctx)}Actions`;

  if (tails.length === 0) {
    return stub(name);
  }

  return lines(
    ...tails.map(
      (tail) => `import { ${actionConst(ctx, tail)} } from "./${tail}.js";`
    ),
    "",
    `const ${name} = {`,
    ...tails.map((tail) => `  ${actionConst(ctx, tail)},`),
    CLOSE_CONST,
    "",
    `export { ${name} };`
  );
};

const PREVIEW_EXPORT = /export\s*\{[^}]*\bpreview\b[^}]*\}/u;

const hasPreview = async (ctx: string, tail: string): Promise<boolean> =>
  PREVIEW_EXPORT.test(
    await readOrEmpty(path.join(HANDLERS, ctx, `${tail}.ts`))
  );

const entryImport = (ctx: string, tail: string, preview: boolean): string => {
  const key = actionConst(ctx, tail);

  const names = preview
    ? `handle as ${key}Handle, preview as ${key}Preview`
    : `handle as ${key}Handle`;

  return `import { ${names} } from "./${tail}.js";`;
};

const entryRow = (ctx: string, tail: string, preview: boolean): string => {
  const key = actionConst(ctx, tail);

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
    `import type { ${pascal(ctx)}Actions } from "@design-studio/actions/${ctx}/index";`,
    `import type { Entries } from "../_core/handler.js";`,
    ...tails.map((tail, index) =>
      entryImport(ctx, tail, Boolean(previews[index]))
    ),
    "",
    `const ${name} = {`,
    ...tails.map((tail, index) =>
      entryRow(ctx, tail, Boolean(previews[index]))
    ),
    `} satisfies Entries<typeof ${pascal(ctx)}Actions>;`,
    "",
    `export { ${name} };`
  );
};

interface RouteAction {
  readonly http: { readonly method: string; readonly path: string };
  readonly id: string;
  readonly invalidates: readonly string[];
}

const loadRoute = async (ctx: string, tail: string): Promise<RouteAction> => {
  const file = path.join(ACTIONS, ctx, `${tail}.ts`);

  try {
    const mod = (await import(pathToFileURL(file).href)) as Record<
      string,
      RouteAction
    >;

    const op = mod[actionConst(ctx, tail)];

    if (!op) {
      throw new Error(`no export named ${actionConst(ctx, tail)}`);
    }

    return op;
  } catch (error) {
    throw new Error(
      `gen-routes: cannot load ${path.relative(ROOT, file)} for routes.ts (${String(error)}). fix: export one defineAction const named ${actionConst(ctx, tail)}`,
      { cause: error }
    );
  }
};

const routeRows = (key: string, op: RouteAction): string[] => [
  `  ${key}: {`,
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

      return op ? routeRows(actionConst(ctx, tail), op) : [];
    }),
    CLOSE_CONST,
    "",
    "export { routes };"
  );
};

interface ContextScan {
  readonly actions: string[];
  readonly domain: string;
  readonly handlers: string[];
}

const byConst =
  (ctx: string) =>
  (left: string, right: string): number =>
    Number(actionConst(ctx, left) > actionConst(ctx, right)) -
    Number(actionConst(ctx, left) < actionConst(ctx, right));

const sortedTails = async (
  dir: string,
  skip: ReadonlySet<string>,
  ctx: string
): Promise<string[]> => {
  const tails = await actionTails(dir, skip);

  return tails.toSorted(byConst(ctx));
};

const scanContext = async (ctx: string): Promise<ContextScan> => ({
  actions: await sortedTails(path.join(ACTIONS, ctx), ACTION_SKIP, ctx),
  domain: ctx,
  handlers: await sortedTails(path.join(HANDLERS, ctx), HANDLER_SKIP, ctx),
});

const contextFiles = async (scan: ContextScan): Promise<GeneratedFile[]> => [
  {
    path: path.join(ACTIONS, scan.domain, "index.ts"),
    text: actionsIndex(scan.domain, scan.actions),
  },
  {
    path: path.join(ACTIONS, scan.domain, "routes.ts"),
    text: await routesFile(scan.domain, scan.actions),
  },
  {
    path: path.join(HANDLERS, scan.domain, "handlers.ts"),
    text: await handlersFile(scan.domain, scan.handlers),
  },
];

const missingFrom = (
  from: string[],
  other: string[],
  folder: string
): string[] =>
  from.flatMap((tail) =>
    new Set(other).has(tail)
      ? []
      : [
          `gen-routes: ${folder}/${tail}.ts has no pair file. fix: add the matching action and handler files, or remove this one`,
        ]
  );

const pairErrors = (scan: ContextScan): string[] => [
  ...missingFrom(
    scan.actions,
    scan.handlers,
    `packages/common/actions/src/${scan.domain}`
  ),
  ...missingFrom(
    scan.handlers,
    scan.actions,
    `apps/desktop/src/server/handlers/${scan.domain}`
  ),
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
  found.every((name) => new Set(allowed).has(name));

const actionExportError = async (
  ctx: string,
  tail: string
): Promise<string[]> => {
  const file = `packages/common/actions/src/${ctx}/${tail}.ts`;
  const text = await readOrEmpty(path.join(ROOT, file));
  const name = actionConst(ctx, tail);
  const found = exportNames(text);

  const defined = new RegExp(
    `\\bconst\\s+${name}\\s*=\\s*defineAction\\(`,
    "u"
  );

  if (found.length === 1 && found[0] === name && defined.test(text)) {
    return [];
  }

  return [
    `gen-routes: ${file} is not one defineAction const named ${name} (exports: ${found.join(", ") || "nothing"}). fix: export only one defineAction const named ${name}`,
  ];
};

const handlerExportError = async (
  ctx: string,
  tail: string
): Promise<string[]> => {
  const file = `apps/desktop/src/server/handlers/${ctx}/${tail}.ts`;
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
    ...scan.actions.map((tail) => actionExportError(scan.domain, tail)),
    ...scan.handlers.map((tail) => handlerExportError(scan.domain, tail)),
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
    contexts.map((ctx) => readOrEmpty(path.join(HANDLERS, ctx, "live.ts")))
  );

  return contexts.filter((_ctx, index) => Boolean(found[index]));
};

const globalFiles = async (contexts: string[]): Promise<GeneratedFile[]> => {
  const live = await liveContexts(contexts);

  const files: GeneratedFile[] = [
    {
      path: path.join(ACTIONS, "all-actions.generated.ts"),
      text: globalList(contexts, {
        constName: "ALL_ACTIONS",
        file: "index.js",
        suffix: "Actions",
      }),
    },
    {
      path: path.join(HANDLERS, "all-entries.generated.ts"),
      text: globalList(contexts, {
        constName: "ALL_ENTRIES",
        file: "handlers.js",
        suffix: "Entries",
      }),
    },
  ];

  if (live.length > 0) {
    files.push({
      path: path.join(HANDLERS, "all-live.generated.ts"),
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
  const entries = await readdir(ACTIONS, { withFileTypes: true });

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

  const files = [
    ...perContext.flat(),
    ...(await globalFiles(contexts)),
    ...(await errorFiles(contexts)),
  ];

  const formatted = await Promise.all(files.map((file) => formatFile(file)));

  const manifests = await toExportFiles();

  return {
    errors,
    files: [...formatted, ...manifests].toSorted((left, right) =>
      left.path.localeCompare(right.path)
    ),
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
      `gen-routes: ${file} is stale or edited by hand. fix: pnpm exec tsx apps/desktop/scripts/gen-routes.ts\n`
    );
  }

  if (stale.length > 0) {
    process.exitCode = 1;
  }
};

const runCli = async (): Promise<void> => {
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
};

const isEntry = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isEntry) {
  await runCli();
}

export { buildAll, staleFiles, writeAll };

export type { Build };
