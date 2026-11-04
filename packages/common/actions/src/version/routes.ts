// @generated
const routes = {
  applyHistoryVersion: {
    id: "version.applyHistory",
    invalidates: [
      "version.get",
      "version.inspectDiff",
      "version.list",
      "version.listHistory",
      "version.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-history/redo",
  },
  applyHunkVersion: {
    id: "version.applyHunk",
    invalidates: [
      "version.get",
      "version.inspectDiff",
      "version.list",
      "version.listHistory",
      "version.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/hunks/revert",
  },
  createSessionVersion: {
    id: "version.createSession",
    invalidates: [
      "version.get",
      "version.inspectDiff",
      "version.list",
      "version.listHistory",
      "version.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-session/save",
  },
  deleteSessionVersion: {
    id: "version.deleteSession",
    invalidates: [
      "version.get",
      "version.inspectDiff",
      "version.list",
      "version.listHistory",
      "version.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-session/discard",
  },
  getVersion: {
    id: "version.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/versions/:versionId",
  },
  inspectDiffVersion: {
    id: "version.inspectDiff",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/versions/:from/changes",
  },
  listHistoryVersion: {
    id: "version.listHistory",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/edit-history/list",
  },
  listHunksVersion: {
    id: "version.listHunks",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/versions/:from/hunks",
  },
  listVersion: {
    id: "version.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/versions",
  },
  renameVersion: {
    id: "version.rename",
    invalidates: [
      "version.get",
      "version.inspectDiff",
      "version.list",
      "version.listHistory",
      "version.listHunks",
    ],
    method: "PATCH",
    path: "/api/projects/:projectId/versions/:versionId",
  },
  restoreHistoryVersion: {
    id: "version.restoreHistory",
    invalidates: [
      "version.get",
      "version.inspectDiff",
      "version.list",
      "version.listHistory",
      "version.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-history/undo",
  },
  restoreVersion: {
    id: "version.restore",
    invalidates: [
      "version.get",
      "version.inspectDiff",
      "version.list",
      "version.listHistory",
      "version.listHunks",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/restore",
  },
} as const;

export { routes };
