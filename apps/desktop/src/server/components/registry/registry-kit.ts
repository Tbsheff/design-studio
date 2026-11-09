import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { Effect, Result, Schema } from "effect";

import { BadRequestError, toDecoder } from "./deps.js";
import { toAliasDirectory } from "./engine/index.js";
import type { AliasDirectories, RegistryAliases } from "./engine/index.js";

interface RegistryKit {
  readonly aliases: RegistryAliases;
  readonly directories: AliasDirectories;
  readonly have: ReadonlySet<string>;
  readonly root: string;
  readonly style: string;
}

const DEFAULT_STYLE = "new-york";

const CONFIG_FILE = "components.json";

const PARENT_FOLDERS = ["packages", "apps"] as const;

const NullableText = Schema.NullOr(Schema.String).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

const ComponentsConfigSchema = Schema.Struct({
  aliases: Schema.Struct({
    components: Schema.String,
    hooks: NullableText,
    lib: NullableText,
    ui: NullableText,
    utils: Schema.String,
  }),
  style: NullableText,
});

const NamesRecord = Schema.Record(Schema.String, Schema.String).pipe(
  Schema.withDecodingDefaultKey(
    Effect.succeed({} as Readonly<Record<string, string>>)
  )
);

const PackageFileSchema = Schema.Struct({
  dependencies: NamesRecord,
  devDependencies: NamesRecord,
  peerDependencies: NamesRecord,
});

const decodeConfig = toDecoder(
  Schema.fromJsonString(ComponentsConfigSchema),
  "ignore"
);

const decodePackage = toDecoder(
  Schema.fromJsonString(PackageFileSchema),
  "ignore"
);

const getText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const hasPath = async (target: string): Promise<boolean> => {
  try {
    await stat(target);

    return true;
  } catch {
    return false;
  }
};

const listChildren = async (parent: string): Promise<string[]> => {
  try {
    const entries = await readdir(parent, { withFileTypes: true });

    const names = entries.flatMap((entry) => {
      if (entry.isDirectory()) {
        return [entry.name];
      }

      return [];
    });

    return names.toSorted();
  } catch {
    return [];
  }
};

const listCandidates = async (workTree: string): Promise<string[]> => {
  const nested = await Promise.all(
    PARENT_FOLDERS.map(async (parent) => {
      const names = await listChildren(path.join(workTree, parent));

      return names.map((name) => path.join(workTree, parent, name));
    })
  );

  const [packages = [], apps = []] = nested;
  const ui = path.join(workTree, "packages", "ui");

  return [workTree, ui, ...packages.filter((folder) => folder !== ui), ...apps];
};

const getConfigFile = async (
  workTree: string
): Promise<{ readonly root: string; readonly text: string }> => {
  const candidates = await listCandidates(workTree);

  const texts = await Promise.all(
    candidates.map((root) => getText(path.join(root, CONFIG_FILE)))
  );

  const index = texts.findIndex((text) => text !== null);
  const root = candidates[index] ?? null;
  const text = texts[index] ?? null;

  if (root === null || text === null) {
    throw new BadRequestError(
      "This project has no components.json. The shadcn registry needs one to know the kit aliases."
    );
  }

  return { root, text };
};

const toParentAlias = (alias: string): string => {
  const cut = alias.lastIndexOf("/");

  if (cut === -1) {
    return alias;
  }

  return alias.slice(0, cut);
};

const toAliases = (
  config: typeof ComponentsConfigSchema.Type
): RegistryAliases => {
  const { aliases } = config;

  return {
    components: aliases.components,
    hooks: aliases.hooks ?? `${toParentAlias(aliases.components)}/hooks`,
    lib: aliases.lib ?? toParentAlias(aliases.utils),
    ui: aliases.ui ?? `${aliases.components}/ui`,
    utils: aliases.utils,
  };
};

const toDirectories = (
  aliases: RegistryAliases,
  hasSrc: boolean
): AliasDirectories => {
  const components = toAliasDirectory(aliases.components, hasSrc);
  const hooks = toAliasDirectory(aliases.hooks, hasSrc);
  const lib = toAliasDirectory(aliases.lib, hasSrc);
  const ui = toAliasDirectory(aliases.ui, hasSrc);

  if (components === null || hooks === null || lib === null || ui === null) {
    throw new BadRequestError(
      "components.json has an alias that the studio cannot map to a folder."
    );
  }

  return { components, hooks, lib, ui };
};

const toPackageNames = (text: string | null): string[] => {
  const result = decodePackage(text ?? "{}");

  if (Result.isFailure(result)) {
    return [];
  }

  const { dependencies, devDependencies, peerDependencies } = result.success;

  return [dependencies, devDependencies, peerDependencies].flatMap((group) =>
    Object.keys(group)
  );
};

const listPackageNames = async (
  roots: readonly string[]
): Promise<Set<string>> => {
  const texts = await Promise.all(
    roots.map((root) => getText(path.join(root, "package.json")))
  );

  return new Set(texts.flatMap((text) => toPackageNames(text)));
};

const inspectRegistryKit = async (workTree: string): Promise<RegistryKit> => {
  const file = await getConfigFile(workTree);
  const result = decodeConfig(file.text);

  if (Result.isFailure(result)) {
    throw new BadRequestError(
      "components.json is not valid JSON, or has no aliases.components and aliases.utils."
    );
  }

  const aliases = toAliases(result.success);
  const hasSrc = await hasPath(path.join(file.root, "src"));

  return {
    aliases,
    directories: toDirectories(aliases, hasSrc),
    have: await listPackageNames([file.root, workTree]),
    root: file.root,
    style: result.success.style ?? DEFAULT_STYLE,
  };
};

const hasKitComponent = async (
  kit: RegistryKit,
  name: string
): Promise<boolean> => {
  const checks = [".tsx", ".ts", ".jsx"].map((extension) =>
    hasPath(path.join(kit.root, kit.directories.ui, `${name}${extension}`))
  );

  const found = await Promise.all(checks);

  return found.some(Boolean);
};

export { hasKitComponent, hasPath, inspectRegistryKit };

export type { RegistryKit };
