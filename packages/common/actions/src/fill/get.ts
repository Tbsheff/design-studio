import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementSourceFields } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields } from "../_core/list-page.js";
import { FillInfoSchema, FillTargetFields } from "./schema.js";

const getFill = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_fill",
    set: "core",
    short: "Read the fill and blend mode of one element, as stops and tokens.",
  },
  confirm: "none",
  description:
    "Read the fill of one element: a solid color or a linear or radial gradient parsed into stops with token names, with any mix-blend-mode or background-blend-mode, from its Tailwind classes or its CSS. Read only. The limit caps each list in the result.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/d/:directionId/fill" },
  id: "fill.get",
  input: Schema.Struct({
    ...FillTargetFields,
    ...ElementSourceFields,
    limit: PageFields.limit,
  }),
  invalidates: [],
  mcp: { name: "get_fill" },
  needs: "project.read",
  output: FillInfoSchema,
  scope: "project",
});

export { getFill };
