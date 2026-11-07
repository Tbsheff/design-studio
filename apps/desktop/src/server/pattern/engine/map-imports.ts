interface PatternImport {
  readonly file: string | null;
  readonly isDefault: boolean;
  readonly name: string;
  readonly specifier: string;
}

interface KitEntry {
  readonly absolute: string;
  readonly file: string;
  readonly kind: "default" | "named";
}

interface TargetKit {
  readonly entries: ReadonlyMap<string, KitEntry>;
  readonly packages: ReadonlySet<string>;
}

interface MappedImport {
  readonly entry: KitEntry | null;
  readonly name: string;
  readonly origin: string | null;
  readonly pattern: PatternImport;
}

interface UnmappedImport {
  readonly name: string;
  readonly reason: string;
}

interface ImportMapping {
  readonly mapped: readonly MappedImport[];
  readonly unmapped: readonly UnmappedImport[];
}

const ALIAS_PREFIX = /^(?:\.{1,2}\/|[#@~]\/|~)/u;

const SCOPED_PARTS = 2;

const toPackageName = (specifier: string): string => {
  const parts = specifier.split("/");

  if (specifier.startsWith("@")) {
    return parts.slice(0, SCOPED_PARTS).join("/");
  }

  return parts[0] ?? specifier;
};

const toMappedImport = (
  item: PatternImport,
  kit: TargetKit | null
): MappedImport | UnmappedImport => {
  if (kit === null) {
    return {
      name: item.name,
      reason: `this project has no React components, so ${item.specifier} cannot be imported`,
    };
  }

  if (item.file !== null || ALIAS_PREFIX.test(item.specifier)) {
    const entry = kit.entries.get(item.name) ?? null;

    if (entry === null) {
      return {
        name: item.name,
        reason: `no exported component named ${item.name} in this project`,
      };
    }

    return { entry, name: item.name, origin: null, pattern: item };
  }

  if (!kit.packages.has(toPackageName(item.specifier))) {
    return {
      name: item.name,
      reason: `package ${toPackageName(item.specifier)} is not a dependency of this project`,
    };
  }

  return { entry: null, name: item.name, origin: null, pattern: item };
};

const isMapped = (
  value: MappedImport | UnmappedImport
): value is MappedImport => "pattern" in value;

const toImportMapping = (
  imports: readonly PatternImport[],
  kit: TargetKit | null
): ImportMapping => {
  const outcomes = imports.map((item) => toMappedImport(item, kit));

  return {
    mapped: outcomes.filter((outcome) => isMapped(outcome)),
    unmapped: outcomes.filter(
      (outcome): outcome is UnmappedImport => !isMapped(outcome)
    ),
  };
};

const toSameProjectMapping = (
  imports: readonly PatternImport[],
  folder: string
): ImportMapping => ({
  mapped: imports.map((item) => ({
    entry: null,
    name: item.name,
    origin: folder,
    pattern: item,
  })),
  unmapped: [],
});

export { toImportMapping, toSameProjectMapping };

export type {
  ImportMapping,
  KitEntry,
  MappedImport,
  PatternImport,
  TargetKit,
  UnmappedImport,
};
