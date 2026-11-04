// @generated
const routes = {
  getPlanShip: {
    id: "ship.getPlan",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/ship",
  },
  getSettingsShip: {
    id: "ship.getSettings",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/ship/settings",
  },
  inspectShip: {
    id: "ship.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/ship/plan",
  },
  publishShip: {
    id: "ship.publish",
    invalidates: ["ship.getPlan", "ship.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/ship",
  },
  setSettingsShip: {
    id: "ship.setSettings",
    invalidates: ["ship.getSettings", "ship.getPlan"],
    method: "PUT",
    path: "/api/projects/:projectId/ship/settings",
  },
} as const;

export { routes };
