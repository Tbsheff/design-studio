import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  IconInsertedSchema,
  IconInsertFields,
  IconTargetFields,
} from "./schema.js";

const insertIcon = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "insert_icon",
    set: "core",
    short:
      "Insert an icon inside, before or after a target: a library component with its import, or an inline SVG. An icon target is swapped in place.",
  },
  confirm: "none",
  description:
    'Insert an icon inside, before or after an element. In a React project with an icon library it writes <SearchIcon className="size-4" /> and adds or extends the import line; otherwise it writes an inline <svg> with stroke="currentColor". When the target is already an icon (an <svg> or an icon component), the new icon replaces it. Find names with list_icons. One version and one undo step.',
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/icons/insert",
  },
  id: "icon.insert",
  input: Schema.Struct({
    ...IconTargetFields,
    ...IconInsertFields,
  }),
  invalidates: ["icon.inspect"],
  mcp: { name: "insert_icon" },
  needs: "project.update",
  output: IconInsertedSchema,
  scope: "project",
});

export { insertIcon };
