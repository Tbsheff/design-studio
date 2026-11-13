import type { VersionMeta } from "@design-studio/contracts";

import type { VersionStore } from "../../shared/server-ports.js";
import { NotFoundError } from "../platform/errors/index.js";
import type { StudioProjectStore } from "../store/projects.js";

const VERSION_LIMIT = 50;

const FILE_LIMIT = 20;

interface VersionListQuery {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface VersionAuthor {
  readonly kind: "agent" | "mcp" | "person";
  readonly name: string;
}

interface VersionListEntry {
  readonly author: VersionAuthor;
  readonly changedFiles: readonly string[];
  readonly createdAt: string;
  readonly id: string;
  readonly kind: unknown;
  readonly name: unknown;
}

const AGENT_AUTHOR: VersionAuthor = { kind: "agent", name: "Studio agent" };

const PERSON_AUTHOR: VersionAuthor = { kind: "person", name: "You" };

const MCP_NAME = "MCP client";

const toVersionAuthor = (meta: VersionMeta): VersionAuthor => {
  if (meta.kind === "run" || meta.origin === "agent") {
    return AGENT_AUTHOR;
  }

  if (meta.origin === "mcp") {
    return { kind: "mcp", name: meta.client ?? MCP_NAME };
  }

  return PERSON_AUTHOR;
};

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
    author: toVersionAuthor(version.meta),
    changedFiles: version.changedFiles.slice(0, FILE_LIMIT),
    createdAt: new Date(version.createdAt).toISOString(),
    id: version.id,
    kind: version.meta.kind,
    name: version.name ?? version.title,
  }));
};

export { readVersionList };

export type { VersionAuthor, VersionListEntry, VersionListQuery };
