import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  ChartInsertedSchema,
  ChartInsertFields,
  ChartProjectFields,
} from "./schema.js";

const insertChart = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "insert_chart",
    set: "kit",
    short:
      "Insert a data chart (bar, line, area, pie, sparkline) at a layer. Uses the project chart kit, raw Recharts or inline SVG. One version, one undo step.",
  },
  confirm: "none",
  description:
    "Insert a data chart inside, before or after a layer, or in place of it, in one version and one undo step. The layer is a layer id from get_layers or a file:line:col source location. Kind is bar, line, area, pie or sparkline. Leave rows out for a seeded sample. In a project with a chart component it writes ChartContainer and Recharts parts with var(--chart-n) colors, and puts the data in a const at the top of the page file. With only the recharts package it writes the same without the kit wrapper. Otherwise it writes a static, accessible inline SVG. Run inspect_chart first to see the mode.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/chart" },
  id: "chart.insert",
  input: Schema.Struct({
    ...ChartProjectFields,
    ...ChartInsertFields,
  }),
  invalidates: ["direct-edit.getTree", "version.list"],
  mcp: { name: "insert_chart" },
  needs: "project.update",
  output: ChartInsertedSchema,
  scope: "project",
});

export { insertChart };
