import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { RunStartedSchema } from "./schema.js";

const Loose = Schema.optionalKey(Schema.Json);

const toLoose = (description: string): typeof Loose =>
  Schema.optionalKey(Schema.Json.annotate({ description }));

const SelectionField = toLoose(
  'The elements the run must change, as a list of picked elements. Each item has selector, tag, text, outerHTML, styles, rect ({ x, y, width, height }), source ({ file, line, col } or null) and ancestors. Example: [{ "selector": "main > h1", "tag": "h1", "text": "Hero", "outerHTML": "<h1>Hero</h1>", "styles": {}, "rect": { "x": 0, "y": 0, "width": 600, "height": 64 }, "source": { "file": "index.html", "line": 24, "col": 5 }, "ancestors": ["main"] }]. Copy the items from the selection that the studio shows.'
);

const EditScopeField = toLoose(
  'Which uses of a shared component the run may change, when the selection comes from a file that 2 or more routes use. "this" changes only this use and never the shared file. "all" changes the shared file for every route. Example: { "choice": "this", "file": "src/components/Hero.tsx", "component": "Hero", "routes": ["/", "/pricing"] }. Leave it out when the selection is used once.'
);

const startRun = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Start one studio agent run in a direction of a project with a prompt. Returns the run id. Read its state with get_run, and stop it with stop_run. Each run saves its edits as one version, so undo takes the run back. Fails when a run is already active in that direction.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/runs",
  },
  id: "run.start",
  input: Schema.Struct({
    attachmentIds: Loose,
    canvas: Loose,
    commentIds: Loose,
    directionId: DirectionIdSchema,
    editScope: EditScopeField,
    effort: Loose,
    focusPaths: Loose,
    lean: Loose,
    level: Loose,
    mentions: Loose,
    mode: Loose,
    plan: Loose,
    projectId: ProjectIdSchema,
    prompt: Schema.String,
    referenceUrls: Loose,
    retryOf: Loose,
    selection: SelectionField,
    states: Loose,
    task: Loose,
  }),
  invalidates: ["run.list"],
  mcp: { name: "start_run" },
  needs: "project.update",
  output: RunStartedSchema,
  scope: "project",
});

export { startRun };
