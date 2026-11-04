// @generated
import type { ProjectActions } from "@design-studio/actions/project/index";
import type { Entries } from "../_core/handler.js";
import { handle as createAttachmentProjectHandle } from "./create-attachment.js";
import { handle as createProjectHandle } from "./create.js";
import {
  handle as deleteCommandRuleProjectHandle,
  preview as deleteCommandRuleProjectPreview,
} from "./delete-command-rule.js";
import { handle as getDesignMdProjectHandle } from "./get-design-md.js";
import { handle as getFileProjectHandle } from "./get-file.js";
import { handle as getHiddenProjectHandle } from "./get-hidden.js";
import { handle as getProjectHandle } from "./get.js";
import { handle as importProjectHandle } from "./import.js";
import { handle as listCommandRulesProjectHandle } from "./list-command-rules.js";
import { handle as listProjectHandle } from "./list.js";
import { handle as moveHiddenProjectHandle } from "./move-hidden.js";
import { handle as searchProjectHandle } from "./search.js";
import { handle as setDesignMdProjectHandle } from "./set-design-md.js";
import { handle as updateProjectHandle } from "./update.js";

const ProjectEntries = {
  createAttachmentProject: { handle: createAttachmentProjectHandle },
  createProject: { handle: createProjectHandle },
  deleteCommandRuleProject: {
    handle: deleteCommandRuleProjectHandle,
    preview: deleteCommandRuleProjectPreview,
  },
  getDesignMdProject: { handle: getDesignMdProjectHandle },
  getFileProject: { handle: getFileProjectHandle },
  getHiddenProject: { handle: getHiddenProjectHandle },
  getProject: { handle: getProjectHandle },
  importProject: { handle: importProjectHandle },
  listCommandRulesProject: { handle: listCommandRulesProjectHandle },
  listProject: { handle: listProjectHandle },
  moveHiddenProject: { handle: moveHiddenProjectHandle },
  searchProject: { handle: searchProjectHandle },
  setDesignMdProject: { handle: setDesignMdProjectHandle },
  updateProject: { handle: updateProjectHandle },
} satisfies Entries<typeof ProjectActions>;

export { ProjectEntries };
