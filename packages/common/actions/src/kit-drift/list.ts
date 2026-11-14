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
    "Find raw HTML elements that duplicate a kit component: button, input, textarea, select, label, table and links styled as buttons. page limits the scan to one file. Each find has file, line, column, kit component and import path, confidence, the classes the kit covers and to keep, and the suggested variant and size. Use apply_kit_drift to swap finds. In an HTML prototype of an app, it scans each page as a file and as rendered for controls, cards and badges with no kit recipe classes. isScriptBuilt marks markup that a page script builds. Fix finds with edit_element, or in the script template.",
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
