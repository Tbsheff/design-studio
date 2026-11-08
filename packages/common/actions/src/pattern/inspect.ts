import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { PatternCandidateSchema, PatternUrlFields } from "./schema.js";

const inspectPattern = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_pattern",
    set: "kit",
    short:
      "List the sections of a web page you can capture as a pattern, each with a crop image.",
  },
  confirm: "none",
  description:
    "List candidate sections of a web page: header, nav, main sections, footer and large blocks. The page loads in a headless browser. Each candidate has a selector, a label, a box, a text sample and a PNG crop in the studio data folder. Changes no project file.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: { method: "GET", path: "/api/projects/:projectId/patterns/candidates" },
  id: "pattern.inspect",
  input: Schema.Struct({
    ...PageFields,
    ...PatternUrlFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_pattern" },
  needs: "studio.read",
  output: pageOf(PatternCandidateSchema),
  scope: "project",
});

export { inspectPattern };
