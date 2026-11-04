// @generated
const routes = {
  applyScenario: {
    id: "scenario.apply",
    invalidates: ["scenario.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/scenario/:frameId/apply",
  },
  createScenario: {
    id: "scenario.create",
    invalidates: ["scenario.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/scenario/:frameId",
  },
  listScenario: {
    id: "scenario.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/scenario/:frameId",
  },
  runScenario: {
    id: "scenario.run",
    invalidates: ["scenario.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/scenario/:frameId/run",
  },
} as const;

export { routes };
