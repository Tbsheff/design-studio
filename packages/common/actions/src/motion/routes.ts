// @generated
const routes = {
  inspectMotion: {
    id: "motion.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/motion",
  },
  setMotion: {
    id: "motion.set",
    invalidates: ["motion.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/motion",
  },
} as const;

export { routes };
