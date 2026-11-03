// @generated
const routes = {
  getVersions: {
    id: "versions.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/versions/:versionId",
  },
  inspectDiffVersions: {
    id: "versions.inspectDiff",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/versions/:from/changes",
  },
  listVersions: {
    id: "versions.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/versions",
  },
  listHistoryVersions: {
    id: "versions.listHistory",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/edit-history/list",
  },
  listHunksVersions: {
    id: "versions.listHunks",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/versions/:from/hunks",
  },
} as const;

export { routes };
