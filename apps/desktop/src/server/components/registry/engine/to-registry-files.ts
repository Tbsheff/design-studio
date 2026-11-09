import { toRewrittenImports } from "./to-rewritten-imports.js";
import type {
  AliasDirectories,
  PlannedFile,
  RegistryAliases,
  RegistryItem,
} from "./types.js";

const DIRECTORY_KEYS: ReadonlyMap<string, keyof AliasDirectories> = new Map<
  string,
  keyof AliasDirectories
>([
  ["registry:block", "components"],
  ["registry:component", "components"],
  ["registry:hook", "hooks"],
  ["registry:lib", "lib"],
  ["registry:ui", "ui"],
]);

const toDirectoryKey = (type: string): keyof AliasDirectories | null =>
  DIRECTORY_KEYS.get(type) ?? null;

const toBaseName = (entryPath: string): string =>
  entryPath.split("/").at(-1) ?? entryPath;

const toRegistryFiles = (
  item: RegistryItem,
  aliases: RegistryAliases,
  directories: AliasDirectories
): PlannedFile[] =>
  item.files.flatMap((entry) => {
    const key = toDirectoryKey(entry.type);

    if (key === null) {
      return [];
    }

    return [
      {
        code: toRewrittenImports(entry.content, aliases),
        relative: `${directories[key]}/${toBaseName(entry.path)}`,
      },
    ];
  });

const toPackageName = (specifier: string): string => {
  const at = specifier.lastIndexOf("@");

  if (at <= 0) {
    return specifier;
  }

  return specifier.slice(0, at);
};

const toMissingDependencies = (
  items: readonly RegistryItem[],
  have: ReadonlySet<string>
): string[] => {
  const specifiers = items.flatMap((item) => [
    ...item.dependencies,
    ...item.devDependencies,
  ]);

  const missing = specifiers.filter(
    (specifier) => !have.has(toPackageName(specifier))
  );

  return [...new Set(missing)];
};

export { toMissingDependencies, toPackageName, toRegistryFiles };
