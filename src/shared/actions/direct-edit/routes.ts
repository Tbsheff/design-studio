// @generated
const routes = {
  applyDirectEdit: {
    id: "direct-edit.apply",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/direct-edit",
  },
  createTokenDirectEdit: {
    id: "direct-edit.createToken",
    invalidates: ["direct-edit.getDesignSystem"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/tokens",
  },
  getDesignSystemDirectEdit: {
    id: "direct-edit.getDesignSystem",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/design-system",
  },
  getPreviewDirectEdit: {
    id: "direct-edit.getPreview",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/preview",
  },
  getTreeDirectEdit: {
    id: "direct-edit.getTree",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/tree",
  },
  getTweaksDirectEdit: {
    id: "direct-edit.getTweaks",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/tweaks",
  },
  inspectTokensDirectEdit: {
    id: "direct-edit.inspectTokens",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/preview",
  },
  runDirectEdit: {
    id: "direct-edit.run",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/check",
  },
  updateTokensDirectEdit: {
    id: "direct-edit.updateTokens",
    invalidates: ["direct-edit.getDesignSystem"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/tokens/update",
  },
  updateTweaksDirectEdit: {
    id: "direct-edit.updateTweaks",
    invalidates: ["direct-edit.getTweaks"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tweaks/commit",
  },
} as const;

export { routes };
