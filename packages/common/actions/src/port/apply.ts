import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { Forbidden } from "../_core/errors/forbidden.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectEditConflict } from "../direct-edit/errors/direct-edit-conflict.js";
import { DirectEditFailed } from "../direct-edit/errors/direct-edit-failed.js";
import { DirectEditNotFound } from "../direct-edit/errors/direct-edit-not-found.js";
import { PortAppliedSchema, PortApplyInputSchema } from "./schema.js";

const applyPort = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "apply_port",
    set: "app",
    short:
      "Write the paired prototype values from inspect_port into the app route source, as Tailwind classes or CSS, then score the route again.",
  },
  confirm: "user",
  description:
    "Write the prototype values that inspect_port pairs into the app route source. For each paired element with one source site, the studio writes the differing spacing, type and border values: in a Tailwind file as classes (mb-6, text-[15px]), else as a style edit. It never writes kept app text, data rows, or a shared or dynamic class site; those come back in skipped with a reason. All writes are one version. Returns the writes and the port score before and after. The user must click Allow first.",
  errors: [
    BadRequest,
    Conflict,
    DirectEditConflict,
    DirectEditFailed,
    DirectEditNotFound,
    Forbidden,
    NotFound,
  ],
  http: { method: "POST", path: "/api/projects/:projectId/port/apply" },
  id: "port.apply",
  input: PortApplyInputSchema,
  invalidates: ["port.inspect"],
  mcp: { name: "apply_port" },
  needs: "project.update",
  output: PortAppliedSchema,
  scope: "project",
});

export { applyPort };
