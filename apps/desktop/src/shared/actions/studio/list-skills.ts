import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { SkillCatalogSchema } from "./schema.js";

const listSkillsStudio = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_skills",
    set: "core",
    short:
      "List the skills that the studio agent can use, and the skill folders that failed to load.",
  },
  confirm: "none",
  description:
    "List the skills that the studio agent can use. It scans the personal skills folder and the enabled plugins on each call. It returns the skills and the problems it found.",
  errors: [],
  http: { method: "GET", path: "/api/skills" },
  id: "studio.listSkills",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { name: "list_skills" },
  needs: "studio.read",
  output: SkillCatalogSchema,
  scope: "device",
});

export { listSkillsStudio };
