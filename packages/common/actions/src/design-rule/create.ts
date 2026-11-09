import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  DesignRuleCreatedSchema,
  DesignRuleRunIdFieldSchema,
  DesignRuleTextFieldSchema,
} from "./schema.js";

const createDesignRule = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "create_design_rule",
    set: "core",
    short:
      "Turn a chat correction into one design rule and add it to the project rules. The rule shows in the Review rules editor.",
  },
  confirm: "none",
  description:
    "Remember a chat correction as one design rule. A short model turns your text into one checkable rule and one plain line, then adds it to the rules the Review rules editor shows. The rules file in the studio data dir holds the rule. DESIGN.md in the repo stays as it is. Fails when the text names nothing to always or never do.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-rules",
  },
  id: "design-rule.create",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    runId: DesignRuleRunIdFieldSchema,
    text: DesignRuleTextFieldSchema,
  }),
  invalidates: ["direct-edit.getRules"],
  mcp: { name: "create_design_rule" },
  needs: "studio.write",
  output: DesignRuleCreatedSchema,
  scope: "project",
});

export { createDesignRule };
