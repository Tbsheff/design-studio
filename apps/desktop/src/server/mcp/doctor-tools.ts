import { DOCTOR_NOTE } from "@design-studio/contracts/app-doctor";

import { z } from "../platform/zod-bridge/index.js";
import { loadTarget } from "./edit-guards.js";
import { defineTool, projectId } from "./edit-kit.js";

const KINDS = [
  "env-validation",
  "missing-env-file",
  "port-in-use",
  "install",
  "auth-redirect",
] as const;

const applyAppFix = defineTool(
  "apply_app_fix",
  z
    .object({
      projectId,
      kind: z.enum(KINDS).describe("Problem kind from app_doctor."),
    })
    .strict(),
  {
    title: "Apply app fix",
    description: `Apply the one-click fix of one app_doctor problem, with the same server code as the fix button on the studio doctor card, then restart the dev server. The studio runs the doctor again and applies only the fix it computed: set env keys found in the app env schema or .env.example (example values only), copy .env.example to .env.local, use a running dev server URL, or restart. You cannot pass env values; ask the user for secrets. Wait for the restart, then call app_doctor again. ${DOCTOR_NOTE}`,
  },
  async (deps, input) => {
    const { project } = await loadTarget(deps, input.projectId);
    const done = await deps.fixApp(project.id, input.kind);
    return {
      result: { content: [{ type: "text", text: done.applied }] },
      activity: {
        projectId: project.id,
        directionId: null,
        summary: `Applied the ${done.kind} app fix`,
      },
    };
  }
);

export const DOCTOR_TOOLS = [applyAppFix];
