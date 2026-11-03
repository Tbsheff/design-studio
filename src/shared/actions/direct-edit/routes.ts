// @generated
const routes = {
  applyDirectEdit: {
    id: "direct-edit.apply",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/direct-edit",
  },
  applySwapDirectEdit: {
    id: "direct-edit.applySwap",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/components/swap",
  },
  createComponentDirectEdit: {
    id: "direct-edit.createComponent",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/components/create",
  },
  createTokenDirectEdit: {
    id: "direct-edit.createToken",
    invalidates: ["direct-edit.getDesignSystem"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/tokens",
  },
  deleteTextDirectEdit: {
    id: "direct-edit.deleteText",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/insert/clear-text",
  },
  getComponentPreviewDirectEdit: {
    id: "direct-edit.getComponentPreview",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/component-preview",
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
  insertComponentDirectEdit: {
    id: "direct-edit.insertComponent",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/insert",
  },
  insertJsxDirectEdit: {
    id: "direct-edit.insertJsx",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/insert/jsx",
  },
  inspectTokensDirectEdit: {
    id: "direct-edit.inspectTokens",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/preview",
  },
  listComponentFoldersDirectEdit: {
    id: "direct-edit.listComponentFolders",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/components/folders",
  },
  listComponentsDirectEdit: {
    id: "direct-edit.listComponents",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/components",
  },
  listInsertableDirectEdit: {
    id: "direct-edit.listInsertable",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/insert/components",
  },
  listSwapCandidatesDirectEdit: {
    id: "direct-edit.listSwapCandidates",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/components/swap-candidates",
  },
  runDirectEdit: {
    id: "direct-edit.run",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/check",
  },
  setImageDirectEdit: {
    id: "direct-edit.setImage",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/image",
  },
  setVectorDirectEdit: {
    id: "direct-edit.setVector",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/vector",
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
