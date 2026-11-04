import { NotFoundError } from "../platform/errors/index.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { VersionStore } from "../types.js";

const VERSION_LIMIT = 50;

const FILE_LIMIT = 20;

interface VersionListQuery {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface VersionListEntry {
  readonly changedFiles: readonly string[];
  readonly createdAt: string;
  readonly id: string;
  readonly kind: unknown;
  readonly name: unknown;
}

const readVersionList = async (
  projects: StudioProjectStore,
  versions: VersionStore,
  query: VersionListQuery
): Promise<readonly VersionListEntry[]> => {
  const project = await projects.get(query.projectId);

  const direction = project.directions.find(
    (item, index) =>
      item.id === query.directionId ||
      (query.directionId === null && index === 0)
  );

  if (!direction) {
    throw new NotFoundError("direction not found");
  }

  const all = await versions.list(project, direction);

  return all.slice(0, VERSION_LIMIT).map((version) => ({
    changedFiles: version.changedFiles.slice(0, FILE_LIMIT),
    createdAt: new Date(version.createdAt).toISOString(),
    id: version.id,
    kind: version.meta.kind,
    name: version.name ?? version.title,
  }));
};

export { readVersionList };

export type { VersionListEntry, VersionListQuery };
