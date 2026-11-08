// @generated
const routes = {
  inspectAccessibility: {
    id: "accessibility.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/accessibility",
  },
  runVisionAccessibility: {
    id: "accessibility.runVision",
    invalidates: ["accessibility.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/accessibility/vision",
  },
  setAccessibility: {
    id: "accessibility.set",
    invalidates: ["accessibility.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/accessibility",
  },
} as const;

export { routes };
