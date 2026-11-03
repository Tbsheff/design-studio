import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { CommentFilterSchema, CommentSchema } from "./schema.js";

const FRAME_REF_MAX = 300;

const DirectionFieldSchema = Schema.NullOr(DirectionIdSchema).annotate({
  description: "Direction id. Leave out for the main direction.",
});

const FrameFieldSchema = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(FRAME_REF_MAX))
).annotate({
  description: "Frame id, @label or page path such as / or /settings.",
});

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const StatusFieldSchema = Schema.NullOr(CommentFilterSchema).annotate({
  description: "open (default: every status but resolved), all, or one status.",
});

const listComment = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "List the comments pinned on a direction, from you, other outside agents and the user, with the same server code as the studio Comments pane: number, author, text, replies, element (selector, source file:line, component), frame, id and status. Read only. Use reply_comment and resolve_comment with the id. Listing comments never sends them to the studio agent.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/comments" },
  id: "comment.list",
  input: Schema.Struct({
    ...PageFields,
    directionId: DirectionFieldSchema,
    frame: FrameFieldSchema,
    projectId: ProjectFieldSchema,
    status: StatusFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "list_comments" },
  needs: "project.read",
  output: pageOf(CommentSchema),
  scope: "project",
});

export { listComment };
