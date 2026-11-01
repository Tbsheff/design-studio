import { defineTool } from "../edit-kit.js";
import type { ToolSpec } from "../edit-kit.js";
import { attachApp } from "./attach-app.js";
import { createProject } from "./create-project.js";
import { attachAppSchema, createProjectSchema } from "./projects-schema.js";

const createProjectTool = defineTool(
  "create_project",
  createProjectSchema,
  {
    description:
      "Create an empty design project in the default projects folder. Returns the project id and the direction id.",
    title: "Create project",
  },
  createProject
);

const attachAppTool = defineTool(
  "attach_app",
  attachAppSchema,
  {
    description:
      "Open an existing Next.js app (or a monorepo with apps/*) as a project. The project points at the folder; nothing is copied. With url the studio proxies your running dev server; without it the studio starts next dev on a free port. A folder that is not attached yet waits for the user to approve it in Design Studio. Returns the project id. Edits from the studio agent and write_file then go to the real files in that folder. A Next.js app folder inside a monorepo (pnpm-workspace.yaml, turbo.json or package.json workspaces) opens at the workspace root with that folder as appDir, so the shared kit, Tailwind CSS and root DESIGN.md are found; the result has workspaceRoot and appDir (workspaceRoot is null outside a monorepo).",
    title: "Attach app",
  },
  attachApp
);

const PROJECTS_LEGACY_TOOLS: ToolSpec[] = [createProjectTool, attachAppTool];

export { PROJECTS_LEGACY_TOOLS };
