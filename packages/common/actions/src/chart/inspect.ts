import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ChartInspectedSchema, ChartProjectFields } from "./schema.js";

const inspectChart = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "inspect_chart",
    set: "kit",
    short:
      "Read only. Find how insert_chart draws charts here: kit, recharts or svg. Returns the kit import path, recharts version, chart kinds and color tokens.",
  },
  confirm: "none",
  description:
    "Find out how insert_chart will draw a chart in this project. Mode kit means the project has a chart component (a ChartContainer export or a chart.tsx file) and the chart uses it. Mode recharts means the project has the recharts package only. Mode svg means a static inline SVG chart. Returns the kit import path, the recharts version, the chart kinds, and the chart color tokens (--chart-1 to --chart-5 or the nearest project tokens). Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/chart" },
  id: "chart.inspect",
  input: Schema.Struct({
    ...ChartProjectFields,
  }),
  invalidates: [],
  mcp: { name: "inspect_chart" },
  needs: "project.read",
  output: ChartInspectedSchema,
  scope: "project",
});

export { inspectChart };
