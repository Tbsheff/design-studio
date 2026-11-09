interface RegistryAliases {
  readonly components: string;
  readonly hooks: string;
  readonly lib: string;
  readonly ui: string;
  readonly utils: string;
}

interface AliasDirectories {
  readonly components: string;
  readonly hooks: string;
  readonly lib: string;
  readonly ui: string;
}

interface RegistryFileEntry {
  readonly content: string;
  readonly path: string;
  readonly type: string;
}

interface RegistryItem {
  readonly dependencies: readonly string[];
  readonly devDependencies: readonly string[];
  readonly files: readonly RegistryFileEntry[];
  readonly name: string;
  readonly registryDependencies: readonly string[];
}

interface PlannedFile {
  readonly code: string;
  readonly relative: string;
}

export type {
  AliasDirectories,
  PlannedFile,
  RegistryAliases,
  RegistryFileEntry,
  RegistryItem,
};
