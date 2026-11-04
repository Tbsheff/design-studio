import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listSkillsStudio } from "../../../shared/actions/studio/list-skills.js";
import { SkillStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListSkillsStudioInput = Input<typeof listSkillsStudio>;

const handle = Effect.fn("studio.listSkills")(function* run(
  _input: ListSkillsStudioInput
) {
  const store = yield* SkillStore;

  const catalog = yield* store.list();

  return { problems: catalog.problems, skills: catalog.skills };
}) satisfies Handle<typeof listSkillsStudio>;

export { handle };
