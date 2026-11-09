import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import {
  SpellingFrameIdSchema,
  SpellingHitSchema,
  SpellingTargetFields,
  SpellingTotalsFields,
} from "./schema.js";

const inspectSpelling = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_spelling",
    set: "core",
    short:
      "Read only. List misspelled words on a frame with suggestions and the layers where each shows.",
  },
  confirm: "none",
  description:
    "List the misspelled words on one canvas frame of a design, from the live page text. Each hit has the word, how often it shows, up to 3 suggested words and the selectors of the layers where it shows. The check skips words with digits, all caps words, camelCase names, URLs, emails and the words in the project word list, in DESIGN.md and in GLOSSARY.md. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/spelling",
  },
  id: "spelling.inspect",
  input: Schema.Struct({
    ...PageFields,
    ...SpellingTargetFields,
    frameId: SpellingFrameIdSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_spelling" },
  needs: "project.read",
  output: pageOf(SpellingHitSchema, SpellingTotalsFields),
  scope: "project",
});

export { inspectSpelling };
