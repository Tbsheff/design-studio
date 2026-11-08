// @generated
const routes = {
  getWalkthrough: {
    id: "walkthrough.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/walkthroughs/:walkthroughId",
  },
  runWalkthrough: {
    id: "walkthrough.run",
    invalidates: ["walkthrough.get"],
    method: "POST",
    path: "/api/projects/:projectId/walkthroughs",
  },
} as const;

export { routes };
