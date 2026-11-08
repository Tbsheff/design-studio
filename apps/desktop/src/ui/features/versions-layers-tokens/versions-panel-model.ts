import type { Version } from "@design-studio/contracts";

import { displayTitle } from "./version-labels.js";
import type { VersionIndex } from "./version-labels.js";

const SHORT_ID_LENGTH = 7;

interface RenamedVersions {
  readonly names: Map<string, string | null>;
  readonly source: Version[];
}

const toVersionTitle = (id: string, index: VersionIndex): string => {
  const version = index.get(id);

  if (version) {
    return displayTitle(version, index);
  }

  return id.slice(0, SHORT_ID_LENGTH);
};

const toCompareSides = (
  sorted: Version[],
  compare: string[]
): Map<string, "A" | "B"> => {
  const ids = new Set(compare);
  const picked = sorted.filter((version) => ids.has(version.id));
  const [newer, older] = picked;

  if (picked.length === 2 && newer && older) {
    return new Map([
      [older.id, "A" as const],
      [newer.id, "B" as const],
    ]);
  }

  return new Map();
};

const toNamedVersions = (
  versions: Version[],
  renamed: RenamedVersions | null
): Version[] => {
  if (!renamed || renamed.source !== versions) {
    return versions;
  }

  return versions.map((version) => {
    if (!renamed.names.has(version.id)) {
      return version;
    }

    const name = renamed.names.get(version.id);
    const copy = { ...version };

    delete copy.name;

    if (name) {
      return { ...copy, name };
    }

    return copy;
  });
};

const toSortedVersions = (versions: Version[]): Version[] =>
  versions.toSorted((first, second) => second.createdAt - first.createdAt);

const toRenamed = (
  previous: RenamedVersions | null,
  versions: Version[],
  id: string,
  name: string | null
): RenamedVersions => {
  let names = new Map<string, string | null>();

  if (previous?.source === versions) {
    ({ names } = previous);
  }

  return { names: new Map(names).set(id, name), source: versions };
};

export {
  toCompareSides,
  toNamedVersions,
  toRenamed,
  toSortedVersions,
  toVersionTitle,
};

export type { RenamedVersions };
