import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { SpellingWordListSchema, SpellingWordsSchema } from "./schema.js";

const setSpelling = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_spelling",
    set: "core",
    short:
      "Set the project word list for the spelling check. Words on the list are not reported.",
  },
  confirm: "none",
  description:
    "Set the word list of a project for the spelling check. The list replaces the old list. Words on the list are not reported as misspelled by inspect_spelling. Pass at most 2000 words, each 1 to 60 letters, apostrophes or hyphens. Pass an empty list to clear it. The change is stored with the project and makes no design version.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/spelling" },
  id: "spelling.set",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    words: SpellingWordsSchema,
  }),
  invalidates: ["spelling.inspect"],
  mcp: { name: "set_spelling" },
  needs: "studio.write",
  output: SpellingWordListSchema,
  scope: "project",
});

export { setSpelling };
