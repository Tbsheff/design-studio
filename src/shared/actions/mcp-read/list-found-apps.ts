import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { FoundAppsViewSchema } from "./schema.js";

const FreshFieldSchema = Schema.Boolean.annotate({
  description: "Scan again instead of using the cached list. Default false.",
});

const listFoundAppsMcpRead = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    'Read only. List the app folders Design Studio finds in the home folder, the same list as "Found on this Mac" on Home: ~/Documents, ~/code, ~/dev, ~/Projects and ~/Developer, two folders deep, with kind (next, vite or html), the Next.js apps of a monorepo (apps), and projectId when the folder is already a project. The scan never leaves the home folder, stops after 1 second (truncated: true) and is cached for a minute; fresh: true scans again. Pass a path to open_folder or attach_app to open one.',
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/found-apps" },
  id: "mcp-read.listFoundApps",
  input: Schema.Struct({
    fresh: Schema.optionalKey(FreshFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "list_found_apps" },
  needs: "project.read",
  output: FoundAppsViewSchema,
  scope: "org",
});

export { listFoundAppsMcpRead };
