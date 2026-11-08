import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { CommandRulesSchema } from "./schema.js";

const deleteCommandRuleProject = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_command_rule_project",
    set: "core",
    short:
      "Delete one saved command rule of a project so the shell command asks again. The user must allow it.",
  },
  confirm: "user",
  description:
    "Delete one saved command rule of a project, so that the shell command asks again before it runs. Returns the remaining rules.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/command-rules/remove",
  },
  id: "project.deleteCommandRule",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    rule: Schema.String,
  }),
  invalidates: ["project.listCommandRules"],
  mcp: { name: "delete_command_rule_project" },
  needs: "project.update",
  output: CommandRulesSchema,
  scope: "project",
});

export { deleteCommandRuleProject };
