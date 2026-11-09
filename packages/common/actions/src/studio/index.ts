// @generated
import { getActivityStudio } from "./get-activity.js";
import { healthStudio } from "./health.js";
import { listSkillsStudio } from "./list-skills.js";

const StudioActions = {
  getActivityStudio,
  healthStudio,
  listSkillsStudio,
} as const;

export { StudioActions };
