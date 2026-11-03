// @generated
const routes = {
  getContextRun: {
    id: "run.getContext",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/run-context",
  },
  getRun: {
    id: "run.get",
    invalidates: [],
    method: "GET",
    path: "/api/runs/:runId",
  },
  listRun: {
    id: "run.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/runs",
  },
  renameRun: {
    id: "run.rename",
    invalidates: ["run.get", "run.list"],
    method: "PATCH",
    path: "/api/runs/:runId",
  },
  setPermissionRun: {
    id: "run.setPermission",
    invalidates: ["run.get"],
    method: "POST",
    path: "/api/runs/:runId/permissions/:requestId",
  },
  setQueueRun: {
    id: "run.setQueue",
    invalidates: ["run.get"],
    method: "PUT",
    path: "/api/runs/:runId/queue",
  },
  setSteerRun: {
    id: "run.setSteer",
    invalidates: ["run.get"],
    method: "POST",
    path: "/api/runs/:runId/steer",
  },
  startRun: {
    id: "run.start",
    invalidates: ["run.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/runs",
  },
  stopRun: {
    id: "run.stop",
    invalidates: ["run.get", "run.list"],
    method: "POST",
    path: "/api/runs/:runId/cancel",
  },
} as const;

export { routes };
