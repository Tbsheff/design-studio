import { COMMENT_TOOLS } from "../comment-tools.js";
import { defineTool } from "../edit-kit.js";
import type { ToolSpec } from "../edit-kit.js";
import { REFERENCE_TOOLS } from "../reference-tools.js";
import { addComment, replyComment, resolveComment } from "./comment-actions.js";
import {
  addCommentSchema,
  replyCommentSchema,
  resolveCommentSchema,
} from "./comments-schema.js";

const addCommentTool = defineTool(
  "add_comment",
  addCommentSchema,
  {
    description:
      "Pin a comment on an element (CSS selector) or on the whole frame. The comment shows your client name. It does not send anything to the studio agent.",
    title: "Add comment",
  },
  addComment
);

const replyCommentTool = defineTool(
  "reply_comment",
  replyCommentSchema,
  {
    description: "Add a reply to a pinned comment.",
    title: "Reply to comment",
  },
  replyComment
);

const resolveCommentTool = defineTool(
  "resolve_comment",
  resolveCommentSchema,
  {
    description: "Mark a pinned comment as resolved.",
    idempotent: true,
    title: "Resolve comment",
  },
  resolveComment
);

const COMMENTS_LEGACY_TOOLS: ToolSpec[] = [
  addCommentTool,
  replyCommentTool,
  resolveCommentTool,
  ...COMMENT_TOOLS,
  ...REFERENCE_TOOLS,
];

export { COMMENTS_LEGACY_TOOLS };
