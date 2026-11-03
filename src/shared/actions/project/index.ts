// @generated
import { createAttachmentProject } from "./create-attachment.js";
import { createProject } from "./create.js";
import { deleteCommandRuleProject } from "./delete-command-rule.js";
import { getDesignMdProject } from "./get-design-md.js";
import { getFileProject } from "./get-file.js";
import { getHiddenProject } from "./get-hidden.js";
import { getProject } from "./get.js";
import { importProject } from "./import.js";
import { listCommandRulesProject } from "./list-command-rules.js";
import { listProject } from "./list.js";
import { moveHiddenProject } from "./move-hidden.js";
import { searchProject } from "./search.js";
import { setDesignMdProject } from "./set-design-md.js";
import { updateProject } from "./update.js";

const ProjectActions = {
  createAttachmentProject,
  createProject,
  deleteCommandRuleProject,
  getDesignMdProject,
  getFileProject,
  getHiddenProject,
  getProject,
  importProject,
  listCommandRulesProject,
  listProject,
  moveHiddenProject,
  searchProject,
  setDesignMdProject,
  updateProject,
} as const;

export { ProjectActions };
