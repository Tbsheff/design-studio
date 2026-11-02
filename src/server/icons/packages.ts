import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { CORE_FRAME } from "./core.js";
import type { IconPackage } from "./deps.js";
import { kebabOf, nameKey, pascal } from "./set.js";
import type { IconSet } from "./set.js";
import { createElementNodesOf, nodeArrayOf } from "./svg.js";
import type { IconNode, SvgFrame } from "./svg.js";

const LUCIDE_EXPORT =
  /export \{(?<names>[^}]*)\} from '\.\/icons\/(?<file>[\w-]+)\.js'/gu;

const EXPORT_NAME = /as (?<name>\w+)/u;
const TABLER_FILE = /^Icon(?<name>[A-Z]\w*)\.mjs$/u;
const HERO_FILE = /^(?<name>[A-Z]\w*)Icon\.js$/u;
const MODULE_EXT = /\.m?js$/u;
const HERO_STROKE = "1.5";

interface LucideIndex {
  exports: Map<string, string>;
  files: Map<string, string>;
}

interface FileSetSpec {
  dir: string;
  file: (name: string) => string;
  frame: SvgFrame;
  importFrom: string;
  parse: (text: string) => IconNode[];
  source: IconPackage;
  stem: RegExp;
}

const readText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const listDir = async (dir: string): Promise<string[]> => {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
};

const lucideIndexes = new Map<string, Promise<LucideIndex>>();

const exportNames = (text: string): string[] =>
  text
    .split(",")
    .flatMap((part) => EXPORT_NAME.exec(part)?.groups?.["name"] ?? []);

const readLucideIndex = async (root: string): Promise<LucideIndex> => {
  const entry = path.join(root, "dist", "esm", "lucide-react.js");
  const text = (await readText(entry)) ?? "";
  const index: LucideIndex = { exports: new Map(), files: new Map() };

  for (const match of text.matchAll(LUCIDE_EXPORT)) {
    const file = match.groups?.["file"] ?? "";
    const names = exportNames(match.groups?.["names"] ?? "");

    index.files.set(file, names[0] ?? pascal(file));

    for (const name of names) {
      index.exports.set(name, file);
    }
  }

  return index;
};

const lucideIndex = (root: string): Promise<LucideIndex> => {
  const known = lucideIndexes.get(root) ?? readLucideIndex(root);

  lucideIndexes.set(root, known);

  return known;
};

const lucideResolve = async (
  root: string,
  raw: string
): Promise<string | null> => {
  const index = await lucideIndex(root);
  const key = nameKey(raw);

  if (index.files.has(key)) {
    return key;
  }

  return (
    index.exports.get(raw.trim()) ?? index.exports.get(pascal(key)) ?? null
  );
};

const lucideComponent = async (root: string, name: string): Promise<string> => {
  const index = await lucideIndex(root);
  const base = index.files.get(name) ?? pascal(name);
  const suffixed = `${base}Icon`;

  if (index.exports.has(suffixed)) {
    return suffixed;
  }

  return base;
};

const nodesIn = async (
  file: string,
  parse: (text: string) => IconNode[]
): Promise<IconNode[] | null> => {
  const text = await readText(file);

  if (text === null) {
    return null;
  }

  return parse(text);
};

const lucideSet = (root: string): IconSet => ({
  component: (name) => lucideComponent(root, name),
  frame: CORE_FRAME,
  importFrom: "lucide-react",
  names: async () => {
    const index = await lucideIndex(root);

    return [...index.files.keys()];
  },
  nodes: (name) =>
    nodesIn(path.join(root, "dist", "esm", "icons", `${name}.js`), nodeArrayOf),
  resolve: (raw) => lucideResolve(root, raw),
  source: "lucide-react",
});

const fileSet = (spec: FileSetSpec): IconSet => {
  const listNames = async (): Promise<string[]> => {
    const files = await listDir(spec.dir);

    return files.flatMap((file) => {
      const name = spec.stem.exec(file)?.groups?.["name"];

      if (!name) {
        return [];
      }

      return [kebabOf(name)];
    });
  };

  return {
    component: (name) =>
      Promise.resolve(spec.file(name).replace(MODULE_EXT, "")),
    frame: spec.frame,
    importFrom: spec.importFrom,
    names: listNames,
    nodes: (name) => nodesIn(path.join(spec.dir, spec.file(name)), spec.parse),
    resolve: async (raw) => {
      const key = nameKey(raw);
      const all = await listNames();

      if (all.includes(key)) {
        return key;
      }

      return null;
    },
    source: spec.source,
  };
};

const tablerSet = (root: string): IconSet =>
  fileSet({
    dir: path.join(root, "dist", "esm", "icons"),
    file: (name) => `Icon${pascal(name)}.mjs`,
    frame: CORE_FRAME,
    importFrom: "@tabler/icons-react",
    parse: nodeArrayOf,
    source: "@tabler/icons-react",
    stem: TABLER_FILE,
  });

const heroSet = (root: string): IconSet =>
  fileSet({
    dir: path.join(root, "24", "outline"),
    file: (name) => `${pascal(name)}Icon.js`,
    frame: { ...CORE_FRAME, strokeWidth: HERO_STROKE },
    importFrom: "@heroicons/react/24/outline",
    parse: createElementNodesOf,
    source: "@heroicons/react",
    stem: HERO_FILE,
  });

const PACKAGE_SETS: Record<IconPackage, (root: string) => IconSet> = {
  "@heroicons/react": heroSet,
  "@tabler/icons-react": tablerSet,
  "lucide-react": lucideSet,
};

export { PACKAGE_SETS };
