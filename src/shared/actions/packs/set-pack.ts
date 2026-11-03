import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  PackIdSchema,
  ProjectIdSchema,
} from "../_core/ids.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import { SaveResultSchema } from "./schema.js";

const setPackPacks = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Save the design system of a direction to the studio library. asNew makes a new user pack; else it updates packId or the pack named in pack.json. A draft must pass the check unless force is true.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/save",
  },
  id: "packs.setPack",
  input: Schema.Struct({
    asNew: Schema.optionalKey(Schema.Boolean),
    directionId: DirectionIdSchema,
    force: Schema.optionalKey(Schema.Boolean),
    name: Schema.String,
    packId: Schema.optionalKey(PackIdSchema),
    projectId: ProjectIdSchema,
  }),
  invalidates: [
    "packs.listSummary",
    "packs.list",
    "packs.getPack",
    "packs.getDraft",
    "packs.inspectDraft",
  ],
  mcp: { off: "ui-bootstrap" },
  needs: "pack.write",
  output: SaveResultSchema,
  scope: "project",
});

export { setPackPacks };
