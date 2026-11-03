import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DevserverAttachedSchema, SourceFieldSchema } from "./schema.js";

const createDevserver = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Attach an app: a folder where the studio starts the dev server, or a url of a dev server you run. The project points at the folder and nothing is copied. A new attach saves the first version in the background.",
  errors: [BadRequest, NotFound],
  http: { method: "POST", path: "/api/projects/attach" },
  id: "devserver.create",
  input: Schema.Struct({
    appDir: Schema.optionalKey(Schema.NullOr(SourceFieldSchema)),
    env: Schema.optionalKey(
      Schema.NullOr(Schema.Record(Schema.String, Schema.String))
    ),
    folder: Schema.optionalKey(Schema.NullOr(SourceFieldSchema)),
    name: Schema.optionalKey(Schema.NullOr(SourceFieldSchema)),
    url: Schema.optionalKey(Schema.NullOr(SourceFieldSchema)),
  }),
  invalidates: ["devserver.get"],
  mcp: { off: "ui-bootstrap" },
  needs: "project.create",
  output: DevserverAttachedSchema,
  scope: "org",
});

export { createDevserver };
