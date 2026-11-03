import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import { PublishedDraftSchema } from "./schema.js";

const NAME_MAX = 80;

const REASON_MIN = 3;

const REASON_MAX = 300;

const ForceFieldSchema = Schema.Boolean.annotate({
  description: "Save even when the design system check fails. Needs reason.",
});

const NameFieldSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(NAME_MAX)
).annotate({ description: "Library name. Leave out to keep the draft name." });

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Design system draft project id.",
});

const ReasonFieldSchema = Schema.String.check(
  Schema.isMinLength(REASON_MIN),
  Schema.isMaxLength(REASON_MAX)
).annotate({
  description:
    "Why you save while the check fails. Shown to the user in the studio feed.",
});

const publishDraftPacks = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Save a design system draft to the studio library, the same as Save in the draft bar. Refused while the sources are read or a studio run is active. The design system check must pass, unless force is true with a reason; call design_system_status to see the problems first.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/design-system-draft/save",
  },
  id: "packs.publishDraft",
  input: Schema.Struct({
    force: Schema.optionalKey(ForceFieldSchema),
    name: Schema.optionalKey(NameFieldSchema),
    projectId: ProjectFieldSchema,
    reason: Schema.optionalKey(ReasonFieldSchema),
  }),
  invalidates: [
    "packs.listSummary",
    "packs.list",
    "packs.getPack",
    "packs.getDraft",
    "packs.inspectDraft",
  ],
  mcp: { name: "save_design_system" },
  needs: "pack.write",
  output: PublishedDraftSchema,
  scope: "project",
});

export { publishDraftPacks };
