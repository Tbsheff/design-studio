import type { Project, Version } from "../../../shared/actions/_core/contracts";
import { projectTypeOf, TYPE_LABELS } from "../../../shared/project-search";

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

const paneAttr = (collapsed: boolean): string => {
  if (collapsed) {
    return "collapsed";
  }

  return "open";
};

const nameOf = (direction: { name: string } | null): string | null =>
  direction?.name ?? null;

const kindLabel = (project: Project): string =>
  TYPE_LABELS[projectTypeOf(project)];

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
  paneAttr,
  reviewPair,
  shipOpener,
  whenDirection,
};
