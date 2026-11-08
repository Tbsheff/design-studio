import type { Attachment, Project, SourceLoc } from "@design-studio/contracts";

import type { ProjectSearchResult } from "../shared/project-search";

interface ProjectWire {
  readonly directions: readonly unknown[];
  readonly id: string;
}

interface SearchWire {
  readonly projects: readonly unknown[];
  readonly query: string;
  readonly routes: readonly unknown[];
}

interface SearchHitWire {
  readonly kind: "project" | "route";
}

const PROJECT_PAGE_LIMIT = 200;

interface AttachmentWire {
  readonly id: string;
  readonly mime: string;
  readonly name: string;
  readonly path: unknown;
}

const isProject = (wire: ProjectWire): wire is Project =>
  typeof wire.id === "string" && Array.isArray(wire.directions);

const isSearchResult = (wire: SearchWire): wire is ProjectSearchResult =>
  Array.isArray(wire.projects) && Array.isArray(wire.routes);

const isAttachment = (wire: AttachmentWire): wire is Attachment =>
  typeof wire.id === "string" && typeof wire.name === "string";

const toProject = (wire: ProjectWire): Project => {
  if (!isProject(wire)) {
    throw new Error("The project response is not valid.");
  }

  return wire;
};

const toSearchResult = (
  query: string,
  items: readonly SearchHitWire[]
): ProjectSearchResult => {
  const projects = items.filter((item) => item.kind === "project");
  const routes = items.filter((item) => item.kind === "route");
  const wire: SearchWire = { projects, query, routes };

  if (!isSearchResult(wire)) {
    throw new Error("The project search response is not valid.");
  }

  return wire;
};

const toAttachment = (wire: AttachmentWire): Attachment => {
  if (!isAttachment(wire)) {
    throw new Error("The attachment response is not valid.");
  }

  return wire;
};

const toStyleQuery = (
  projectId: string,
  directionId: string,
  source: SourceLoc
): SourceLoc & { directionId: string; projectId: string } => ({
  ...source,
  directionId,
  projectId,
});

export {
  PROJECT_PAGE_LIMIT,
  toAttachment,
  toProject,
  toSearchResult,
  toStyleQuery,
};

export type { ProjectWire, SearchHitWire, AttachmentWire };
