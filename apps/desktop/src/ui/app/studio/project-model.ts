import type { Project, Version } from "@design-studio/contracts";

import { projectTypeOf, toKindBadge } from "../../../shared/project-search";

const shipOpener = (
  project: { app?: unknown },
  setOpen: (open: boolean) => void
): (() => void) | null => {
  if (!project.app) {
    return null;
  }

  return () => setOpen(true);
};

const reviewPair = (
  list: readonly Version[],
  versionId: string
): [Version, Version] | null => {
  const version = list.find((entry) => entry.id === versionId);

  if (!version) {
    return null;
  }

  const parent = list.find((entry) => entry.id === version.parentId);

  if (!parent) {
    return null;
  }

  return [parent, version];
};

const exportTarget = (
  versions: Version[],
  direction: { headVersionId: string | null } | null
): string | null => {
  const head = versions.find((entry) => entry.id === direction?.headVersionId);

  return (head ?? versions[0])?.id ?? null;
};

const openAttr = (isOpen: boolean): string => {
  if (isOpen) {
    return "open";
  }

  return "closed";
};

const nameOf = (direction: { name: string } | null): string | null =>
  direction?.name ?? null;

const kindLabel = (project: Project): string | null =>
  toKindBadge(projectTypeOf(project));

const whenDirection = <Value>(
  did: string | null,
  value: Value
): Value | null => {
  if (!did) {
    return null;
  }

  return value;
};

const appDirOf = (project: {
  app?: { appDir: string } | null;
}): string | null => project.app?.appDir ?? null;

export {
  appDirOf,
  exportTarget,
  kindLabel,
  nameOf,
  openAttr,
  reviewPair,
  shipOpener,
  whenDirection,
};
