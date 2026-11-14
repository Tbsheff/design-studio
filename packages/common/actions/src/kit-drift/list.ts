import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { KitDriftListFields, KitDriftSchema } from "./schema.js";

const listKitDrift = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_kit_drift",
    set: "kit",
    short:
      "Find raw button, input and textarea elements in app source that should be kit components such as Button or Input.",
  },
  confirm: "none",
  description:
    "Find raw HTML elements that duplicate a kit component: button, input, textarea, select, label, table and links styled as buttons. page limits the scan to one file; leave it out to scan every route and component file. Each find has file, line, column, the kit component and import path, confidence, the classes the kit covers, the classes to keep, and the suggested variant and size. Use apply_kit_drift to swap finds. In an HTML prototype of an app, it scans its pages for controls and cards (tag card, with parts) without the kit recipe classes or data-slot; fix those with edit_element.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/kit-drift" },
  id: "kit-drift.list",
  input: Schema.Struct({
    ...KitDriftListFields,
    ...PageFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_kit_drift" },
  needs: "project.read",
  output: pageOf(KitDriftSchema),
  scope: "project",
});

export { listKitDrift };
