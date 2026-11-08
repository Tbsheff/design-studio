// @generated
const routes = {
  getAttentionCritique: {
    id: "critique.getAttention",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId/attention",
  },
  getCritique: {
    id: "critique.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId",
  },
  runAttentionCritique: {
    id: "critique.runAttention",
    invalidates: ["critique.getAttention"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId/attention",
  },
  runCritique: {
    id: "critique.run",
    invalidates: ["critique.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId/run",
  },
} as const;

export { routes };
