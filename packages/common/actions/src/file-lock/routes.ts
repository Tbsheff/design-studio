// @generated
const routes = {
  getFileLock: {
    id: "file-lock.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/file-lock",
  },
  setFileLock: {
    id: "file-lock.set",
    invalidates: ["file-lock.get"],
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/file-lock",
  },
} as const;

export { routes };
