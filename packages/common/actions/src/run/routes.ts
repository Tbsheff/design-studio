// @generated
const routes = {
  createDecisionRun: {
    id: "run.createDecision",
    invalidates: ["run.get", "run.listDecisions"],
    method: "POST",
    path: "/api/projects/:projectId/runs/:runId/decisions",
  },
  getContextRun: {
    id: "run.getContext",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/run-context",
  },
  getDraftRun: {
    id: "run.getDraft",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/runs/:runId/draft",
  },
  getRun: {
    id: "run.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/runs/:runId",
  },
  listDecisionsRun: {
    id: "run.listDecisions",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/runs/:runId/decisions",
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
    path: "/api/projects/:projectId/runs/:runId",
  },
  setDecisionRun: {
    id: "run.setDecision",
    invalidates: ["run.get", "run.list", "run.listDecisions"],
    method: "POST",
    path: "/api/projects/:projectId/runs/:runId/decisions/:decisionId",
  },
  setPermissionRun: {
    id: "run.setPermission",
    invalidates: ["run.get"],
    method: "POST",
    path: "/api/projects/:projectId/runs/:runId/permissions/:requestId",
  },
  setQueueRun: {
    id: "run.setQueue",
    invalidates: ["run.get"],
    method: "PUT",
    path: "/api/projects/:projectId/runs/:runId/queue",
  },
  setSteerRun: {
    id: "run.setSteer",
    invalidates: ["run.get"],
    method: "POST",
    path: "/api/projects/:projectId/runs/:runId/steer",
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
    path: "/api/projects/:projectId/runs/:runId/cancel",
  },
} as const;

export { routes };
