// @generated
const routes = {
  createAttachmentProject: {
    id: "project.createAttachment",
    invalidates: ["project.get"],
    method: "POST",
    path: "/api/projects/:projectId/attachments",
  },
  createProject: {
    id: "project.create",
    invalidates: ["project.list"],
    method: "POST",
    path: "/api/projects",
  },
  deleteCommandRuleProject: {
    id: "project.deleteCommandRule",
    invalidates: ["project.listCommandRules"],
    method: "POST",
    path: "/api/projects/:projectId/command-rules/remove",
  },
  getDesignMdProject: {
    id: "project.getDesignMd",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-md/content",
  },
  getFileProject: {
    id: "project.getFile",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/files",
  },
  getProject: {
    id: "project.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId",
  },
  importProject: {
    id: "project.import",
    invalidates: ["project.list"],
    method: "POST",
    path: "/api/projects/import",
  },
  listCommandRulesProject: {
    id: "project.listCommandRules",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/command-rules",
  },
  listHiddenProject: {
    id: "project.listHidden",
    invalidates: [],
    method: "GET",
    path: "/api/hidden-projects",
  },
  listProject: {
    id: "project.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects",
  },
  moveHiddenProject: {
    id: "project.moveHidden",
    invalidates: ["project.list", "project.listHidden"],
    method: "POST",
    path: "/api/hidden-projects/move",
  },
  searchProject: {
    id: "project.search",
    invalidates: [],
    method: "GET",
    path: "/api/project-search",
  },
  setDesignMdProject: {
    id: "project.setDesignMd",
    invalidates: ["project.getDesignMd"],
    method: "PUT",
    path: "/api/projects/:projectId/design-md",
  },
  updateProject: {
    id: "project.update",
    invalidates: ["project.get", "project.list"],
    method: "PATCH",
    path: "/api/projects/:projectId/settings",
  },
} as const;

export { routes };
