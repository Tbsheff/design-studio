import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

interface GeneratedFile {
  path: string;
  text: string;
}

const ROOT = path.join(import.meta.dirname, "..");

const CONTRACT = path.join(ROOT, "src/shared/contract");

const SERVICES = path.join(ROOT, "src/server/services");

const HEADER = "// @generated";

const CORE = "_core";

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

const contextFiles = (ctx: string): GeneratedFile[] => [
  {
    path: path.join(CONTRACT, ctx, "index.ts"),
    text: stub(`${pascal(ctx)}Ops`),
  },
  { path: path.join(CONTRACT, ctx, "routes.ts"), text: stub("routes") },
  {
    path: path.join(SERVICES, ctx, "handlers.ts"),
    text: stub(`${pascal(ctx)}Entries`),
  },
];

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
    "} as const;",
    "",
    `export { ${spec.constName} };`
  );

const readOrEmpty = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

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

const buildAll = async (): Promise<GeneratedFile[]> => {
  const contexts = await scanContexts();

  const files = [
    ...contexts.flatMap((ctx) => contextFiles(ctx)),
    ...(await globalFiles(contexts)),
  ];

  return files.toSorted((left, right) => left.path.localeCompare(right.path));
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

const files = await buildAll();

if (process.argv.includes("--check")) {
  await check(files);
} else {
  await writeAll(files);
  process.stdout.write(`gen-routes: wrote ${files.length} files\n`);
}
