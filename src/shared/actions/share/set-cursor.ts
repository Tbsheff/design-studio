import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";

const CursorFrameSchema = Schema.NullOr(Schema.String);

const setCursorShare = defineAction({
  access: "edit",
  agent: { off: "stream" },
  confirm: "none",
  description:
    "Send the position of your cursor on the canvas to the viewers of the live share links of a project. Send a null frameId to hide the cursor.",
  errors: [BadRequest, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/share-cursor" },
  id: "share.setCursor",
  input: Schema.Struct({
    frameId: Schema.optionalKey(CursorFrameSchema),
    pointX: Schema.optionalKey(Schema.Number),
    pointY: Schema.optionalKey(Schema.Number),
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "stream" },
  needs: "project.read",
  output: Schema.Struct({}),
  scope: "project",
});

export { setCursorShare };
