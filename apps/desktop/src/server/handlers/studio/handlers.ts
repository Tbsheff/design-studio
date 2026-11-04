// @generated
import type { StudioActions } from "../../../shared/actions/studio/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as healthStudioHandle } from "./health.js";
import { handle as listSkillsStudioHandle } from "./list-skills.js";

const StudioEntries = {
  healthStudio: { handle: healthStudioHandle },
  listSkillsStudio: { handle: listSkillsStudioHandle },
} satisfies Entries<typeof StudioActions>;

export { StudioEntries };
