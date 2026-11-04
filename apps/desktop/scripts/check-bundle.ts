import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

interface ManifestChunk {
  file: string;
  imports?: string[];
  name?: string;
}

interface BundleModule {
  bytes: number;
  id: string;
}

interface BundleChunk {
  file: string;
  modules: BundleModule[];
}

interface BudgetB1 {
  bytes: number;
  chunks: string[];
}

interface Baseline {
  B1?: BudgetB1;
}

interface Banned {
  kind: string;
  module: RegExp;
  text: RegExp;
}

interface DistText {
  file: string;
  text: string;
}

type Manifest = Record<string, ManifestChunk>;

const DIST = "dist/ui";
const ENTRY = "index.html";
const B1_LIMIT = 300_000;
const MAX_HITS = 10;
const BASELINE = new URL("perf/baseline.json", import.meta.url);
const REBUILD = "pnpm run build:ui && pnpm run check:bundle";
const FIND_IMPORT = String.raw`grep -rnE "from \"(effect|@effect/|zod|node:)" src/ui src/shared src/bridge`;

const POLYFILLS = [
  "buffer",
  "process",
  "events",
  "util",
  "path-browserify",
  "stream-browserify",
  "crypto-browserify",
  "readable-stream",
  "vite-plugin-node-polyfills",
];

const BANNED: Banned[] = [
  {
    kind: "effect",
    module: /(?:^|\/)node_modules\/(?:effect|@effect\/[^/]+)\//u,
    text: /node_modules\/(?:effect|@effect\/[^/"'`]+)\//u,
  },
  {
    kind: "zod",
    module: /(?:^|\/)node_modules\/zod\//u,
    text: /node_modules\/zod\//u,
  },
  {
    kind: "polyfill",
    module: new RegExp(
      `__vite-browser-external|(?:^|/)node_modules/(?:${POLYFILLS.join("|")})/`,
      "u"
    ),
    text: /__vite-browser-external/u,
  },
];

const readJson = async <Value>(
  file: string | URL,
  fallback: Value
): Promise<Value> => {
  try {
    const text = await readFile(file, "utf-8");

    return JSON.parse(text) as Value;
  } catch {
    return fallback;
  }
};

const chunkName = (chunk: ManifestChunk): string =>
  chunk.name ?? path.basename(chunk.file).replace(/-[\w-]{8}\.js$/u, "");

const preloadSet = (
  manifest: Manifest,
  key: string,
  seen: Map<string, ManifestChunk>
): Map<string, ManifestChunk> => {
  const chunk = manifest[key];

  if (seen.has(key) || !chunk) {
    return seen;
  }

  seen.set(key, chunk);

  for (const next of chunk.imports ?? []) {
    preloadSet(manifest, next, seen);
  }

  return seen;
};

const listFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });

  const nested = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return await listFiles(full);
      }

      return [full];
    })
  );

  return nested.flat();
};

const sizeOf = async (file: string): Promise<number> => {
  const info = await stat(path.join(DIST, file));

  return info.size;
};

const checkB1 = async (
  manifest: Manifest,
  budget: BudgetB1
): Promise<string[]> => {
  const chunks = [...preloadSet(manifest, ENTRY, new Map()).values()].filter(
    (chunk) => chunk.file.endsWith(".js")
  );

  const sizes = await Promise.all(
    chunks.map(async (chunk) => await sizeOf(chunk.file))
  );

  const bytes = sizes.reduce((sum, size) => sum + size, 0);
  const names = chunks.map((chunk) => chunkName(chunk));
  const failures: string[] = [];

  console.log(
    `B1 Home bytes ${bytes} B (limit < ${B1_LIMIT} B, baseline ${budget.bytes} B, delta ${bytes - budget.bytes} B); chunks: ${names.join(", ")}`
  );

  if (bytes >= B1_LIMIT) {
    failures.push(
      `B1 Home entry JS plus modulepreload chunks is ${bytes} B, at or over ${B1_LIMIT} B. fix: lazy-load the new Home import with import(), then ${REBUILD}`
    );
  }

  const knownChunks = new Set(budget.chunks);

  for (const name of names.filter((item) => !knownChunks.has(item))) {
    failures.push(
      `B1 chunk "${name}" is new to the Home preload set (not in scripts/perf/baseline.json B1.chunks). fix: lazy-load the import that pulls it in, then ${REBUILD}`
    );
  }

  return failures;
};

const readTexts = async (): Promise<DistText[]> => {
  const files = await listFiles(DIST);
  const code = files.filter((file) => /\.(?:js|css|html)$/u.test(file));

  return await Promise.all(
    code.map(async (file) => {
      const text = await readFile(file, "utf-8");

      return { file, text };
    })
  );
};

const checkKind = (
  rule: Banned,
  modules: BundleChunk[],
  texts: DistText[]
): string[] => {
  const hits: string[] = [];
  let bytes = 0;

  for (const chunk of modules) {
    for (const item of chunk.modules.filter((entry) =>
      rule.module.test(entry.id)
    )) {
      hits.push(`${item.id} (${item.bytes} B) is in ${chunk.file}`);
      bytes += item.bytes;
    }
  }

  const paths = texts.filter((item) => rule.text.test(item.text));

  console.log(
    `B2 ${rule.kind} ${bytes} B (pre-minify) in ${hits.length} modules`
  );

  return [
    ...hits
      .slice(0, MAX_HITS)
      .map(
        (hit) =>
          `B2 ${rule.kind} module ${hit}. fix: ${FIND_IMPORT}, make that import a type import or move the code to the server, then ${REBUILD}`
      ),
    ...paths.map(
      (item) =>
        `B2 ${rule.kind} module path text is in ${item.file}. fix: ${FIND_IMPORT}, remove that import, then ${REBUILD}`
    ),
  ];
};

const main = async (): Promise<number> => {
  const manifest = await readJson<Manifest>(
    path.join(DIST, ".vite/manifest.json"),
    {}
  );

  const modules = await readJson<BundleChunk[]>(
    path.join(DIST, ".vite/modules.json"),
    []
  );

  const baseline = await readJson<Baseline>(BASELINE, {});
  const budget = baseline.B1;

  if (!(ENTRY in manifest) || modules.length === 0) {
    console.error(
      `check-bundle: ${DIST}/.vite/manifest.json or modules.json is missing. fix: pnpm run build:ui`
    );

    return 1;
  }

  if (!budget) {
    console.error(
      "check-bundle: scripts/perf/baseline.json has no B1 key. fix: git checkout scripts/perf/baseline.json"
    );

    return 1;
  }

  const texts = await readTexts();

  const failures = [
    ...(await checkB1(manifest, budget)),
    ...BANNED.flatMap((rule) => checkKind(rule, modules, texts)),
  ];

  for (const failure of failures) {
    console.error(failure);
  }

  if (failures.length > 0) {
    console.log(`check-bundle: ${failures.length} failures`);

    return 1;
  }

  console.log("check-bundle: pass");

  return 0;
};

process.exitCode = await main();
