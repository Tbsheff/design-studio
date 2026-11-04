import { z } from "zod";

import {
  IMPORT_PAGE_DESCRIPTION,
  importPage,
  PageImportError,
  toImportRequest,
} from "../page-import/index.js";
import type { ImportCommit } from "../page-import/index.js";
import { importPageFields } from "../platform/tool-fields/page-import.js";
import { EditError, loadTarget, refuseWhileRunning } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import {
  defineTool,
  directionId as directionIdSchema,
  ok,
  projectId as projectIdSchema,
  versionActivity,
} from "./edit-kit.js";
import type { Done } from "./edit-kit.js";

const importSchema = z.strictObject({
  directionId: directionIdSchema,
  projectId: projectIdSchema,
  ...importPageFields,
});

type ImportInput = z.output<typeof importSchema>;

const commitOf = (deps: EditDeps, client: string): ImportCommit => ({
  client,
  deps: {
    bus: deps.bus,
    projects: deps.projects,
    runner: deps.runner,
    versions: deps.versions,
  },
  history: deps.history ?? null,
});

const runImport = async (
  deps: EditDeps,
  input: ImportInput,
  client: string
): Promise<Done> => {
  const found = await loadTarget(deps, input.projectId, input.directionId);

  refuseWhileRunning(deps, found.project, found.direction);

  try {
    const done = await importPage(
      {
        canvas: deps.canvas,
        direction: found.direction,
        project: found.project,
      },
      toImportRequest(input),
      commitOf(deps, client)
    );

    return {
      activity: versionActivity(
        found.project,
        found.direction,
        `Imported page ${done.result.page} from ${done.result.sourceUrl}`,
        done.version
      ),
      result: ok(done.result),
    };
  } catch (error) {
    if (error instanceof PageImportError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const importPageTool = defineTool(
  "import_page",
  importSchema,
  { description: IMPORT_PAGE_DESCRIPTION, title: "Import page" },
  runImport
);

const PAGE_IMPORT_TOOLS = [importPageTool];

export { PAGE_IMPORT_TOOLS };
