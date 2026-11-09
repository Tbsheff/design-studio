// @generated
import type { StudioActions } from "@design-studio/actions/studio/index";

import type { Entries } from "../_core/handler.js";
import { handle as getActivityStudioHandle } from "./get-activity.js";
import { handle as healthStudioHandle } from "./health.js";
import { handle as listSkillsStudioHandle } from "./list-skills.js";

const StudioEntries = {
  getActivityStudio: { handle: getActivityStudioHandle },
  healthStudio: { handle: healthStudioHandle },
  listSkillsStudio: { handle: listSkillsStudioHandle },
} satisfies Entries<typeof StudioActions>;

export { StudioEntries };
