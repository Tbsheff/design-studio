// @generated
const routes = {
  applyHistoryVersions: {
    id: "versions.applyHistory",
    invalidates: [
      "versions.get",
      "versions.inspectDiff",
      "versions.list",
      "versions.listHistory",
      "versions.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-history/redo",
  },
  applyHunkVersions: {
    id: "versions.applyHunk",
    invalidates: [
      "versions.get",
      "versions.inspectDiff",
      "versions.list",
      "versions.listHistory",
      "versions.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/hunks/revert",
  },
  createSessionVersions: {
    id: "versions.createSession",
    invalidates: [
      "versions.get",
      "versions.inspectDiff",
      "versions.list",
      "versions.listHistory",
      "versions.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-session/save",
  },
  deleteSessionVersions: {
    id: "versions.deleteSession",
    invalidates: [
      "versions.get",
      "versions.inspectDiff",
      "versions.list",
      "versions.listHistory",
      "versions.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-session/discard",
  },
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
  listVersions: {
    id: "versions.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/versions",
  },
  renameVersions: {
    id: "versions.rename",
    invalidates: [
      "versions.get",
      "versions.inspectDiff",
      "versions.list",
      "versions.listHistory",
      "versions.listHunks",
    ],
    method: "PATCH",
    path: "/api/projects/:projectId/versions/:versionId",
  },
  restoreHistoryVersions: {
    id: "versions.restoreHistory",
    invalidates: [
      "versions.get",
      "versions.inspectDiff",
      "versions.list",
      "versions.listHistory",
      "versions.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-history/undo",
  },
  restoreVersions: {
    id: "versions.restore",
    invalidates: [
      "versions.get",
      "versions.inspectDiff",
      "versions.list",
      "versions.listHistory",
      "versions.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/restore",
  },
} as const;

export { routes };
