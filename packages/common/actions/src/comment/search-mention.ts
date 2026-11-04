import { Effect, Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { MentionFilesSchema } from "./schema.js";

const QUERY_MAX = 200;

const MENTION_FILES_MAX = 3000;

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id whose work tree to search.",
});

const QueryFieldSchema = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(QUERY_MAX))
).annotate({
  description:
    "Part of a file path to look for. Leave out to get every file, up to the limit.",
});

const LimitFieldSchema = Schema.Int.check(
  Schema.isBetween({ maximum: MENTION_FILES_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(MENTION_FILES_MAX)));

const searchMentionComment = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Search the files of a direction work tree that a comment or a prompt can mention with @. Returns relative file paths that match the query, sorted by name. Read only. The studio comment box uses it for its mention picker.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/mention-files" },
  id: "comment.searchMention",
  input: Schema.Struct({
    directionId: DirectionFieldSchema,
    limit: LimitFieldSchema,
    projectId: ProjectIdSchema,
    query: QueryFieldSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: MentionFilesSchema,
  scope: "project",
});

export { searchMentionComment };
