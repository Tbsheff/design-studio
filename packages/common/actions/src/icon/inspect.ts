import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  IconInspectFields,
  IconListSchema,
  IconTargetFields,
} from "./schema.js";

const inspectIcon = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_icons",
    set: "core",
    short:
      "Read only. Search icons for insert_icon: the project icon library (lucide-react, heroicons, tabler) or the bundled lucide set. Name, component and SVG preview.",
  },
  confirm: "none",
  description:
    "Search the icons that insert_icon can add. In a React project or attached app it reads the icon library the project has installed (lucide-react, @heroicons/react or @tabler/icons-react) from node_modules; HTML projects and projects with no icon library get a bundled set of about 360 lucide icons (ISC license). Returns name, library, the React component name (null for inline SVG) and an SVG preview. The limit caps the icons. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/icons",
  },
  id: "icon.inspect",
  input: Schema.Struct({
    ...IconTargetFields,
    ...IconInspectFields,
  }),
  invalidates: [],
  mcp: { name: "list_icons" },
  needs: "project.read",
  output: IconListSchema,
  scope: "project",
});

export { inspectIcon };
