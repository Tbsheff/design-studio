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
  deleteProject: {
    id: "project.delete",
    invalidates: ["project.list", "project.search"],
    method: "DELETE",
    path: "/api/projects/:projectId",
  },
  duplicateProject: {
    id: "project.duplicate",
    invalidates: ["project.list", "project.search"],
    method: "POST",
    path: "/api/projects/:projectId/duplicate",
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
  getHiddenProject: {
    id: "project.getHidden",
    invalidates: [],
    method: "GET",
    path: "/api/hidden-projects",
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
  listProject: {
    id: "project.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects",
  },
  moveHiddenProject: {
    id: "project.moveHidden",
    invalidates: ["project.list", "project.getHidden"],
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
    invalidates: ["image-search.get", "project.get", "project.list"],
    method: "PATCH",
    path: "/api/projects/:projectId/settings",
  },
} as const;

export { routes };
