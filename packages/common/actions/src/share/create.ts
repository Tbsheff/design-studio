import { SHARE_EXPIRY_HOURS } from "@design-studio/contracts/share";
import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unauthenticated } from "../_core/errors/unauthenticated.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import {
  DirectionIdSchema,
  ProjectIdSchema,
  VersionIdSchema,
} from "../_core/ids.js";
import { ShareCreatedSchema } from "./schema.js";

const NullableDirectionSchema = Schema.NullOr(DirectionIdSchema);

const DirectionFieldSchema = NullableDirectionSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const ExpiryLiteralsSchema = Schema.Literals(SHARE_EXPIRY_HOURS);

const ExpiryFieldSchema = ExpiryLiteralsSchema.annotate({
  description: "Hours until the link ends: 1, 24 or 168. Default 24.",
});

const FrameRefsSchema = Schema.Array(Schema.String);

const FramesFieldSchema = FrameRefsSchema.annotate({
  description:
    "Frame ids or @labels from canvas_list. Leave out for every visible frame of the direction.",
});

const LiveFieldSchema = Schema.Boolean.annotate({
  description:
    "Live link: viewers get new PNG snapshots each time a version is saved, and their cursors show on the studio canvas.",
});

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const TitleFieldSchema = Schema.String.annotate({
  description: "Title on the shared page. Leave out for the project name.",
});

const VersionFieldSchema = VersionIdSchema.annotate({
  description: "Version id to share. Leave out for the head version.",
});

const createShare = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_share_link",
    set: "app",
    short:
      "Make a read-only share link of canvas frames as PNG snapshots. The user must click Allow in Design Studio first.",
  },
  confirm: "user",
  description:
    "Make a read-only share link for canvas frames so other people can view the design and comment. The user must click Allow in Design Studio first. Returns the link URL once. Viewers see only PNG snapshots, served on a separate listener on this computer unless the user turns on Allow on local network. Viewer comments land as drafts in the Comments pane. A live link swaps in new snapshots after each saved version. The link ends after its expiry and can be revoked.",
  errors: [BadRequest, Conflict, NotFound, Unauthenticated, Unavailable],
  http: { method: "POST", path: "/api/projects/:projectId/shares" },
  id: "share.create",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    expiresInHours: Schema.optionalKey(ExpiryFieldSchema),
    frames: Schema.optionalKey(FramesFieldSchema),
    live: Schema.optionalKey(LiveFieldSchema),
    projectId: ProjectFieldSchema,
    title: Schema.optionalKey(TitleFieldSchema),
    versionId: Schema.optionalKey(VersionFieldSchema),
  }),
  invalidates: ["share.list"],
  mcp: { name: "create_share_link" },
  needs: "project.share",
  output: ShareCreatedSchema,
  scope: "project",
});

export { createShare };
