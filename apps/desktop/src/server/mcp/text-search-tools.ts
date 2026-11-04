import { z } from "../platform/zod-bridge/index.js";
import { TextSearchError } from "../text-search/errors.js";
import {
  SEARCH_TEXT_DESCRIPTION,
  toSearchQuery,
  toUpdateRequest,
  UPDATE_TEXT_DESCRIPTION,
} from "../text-search/input.js";
import type { SearchTarget } from "../text-search/scope.js";
import { searchText } from "../text-search/search-text.js";
import {
  searchTextFields,
  updateTextFields,
} from "../text-search/tool-fields.js";
import { updateText } from "../text-search/update-text.js";
import type { UpdateCommit } from "../text-search/update-text.js";
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

const searchSchema = z.strictObject({
  directionId: directionIdSchema,
  projectId: projectIdSchema,
  ...searchTextFields,
});

const updateSchema = z.strictObject({
  directionId: directionIdSchema,
  projectId: projectIdSchema,
  ...updateTextFields,
});

type SearchInput = z.output<typeof searchSchema>;

type UpdateInput = z.output<typeof updateSchema>;

const targetOf = async (
  deps: EditDeps,
  input: { projectId: string; directionId?: string | undefined }
): Promise<SearchTarget> => {
  const found = await loadTarget(deps, input.projectId, input.directionId);
  const snapshot = await deps.canvas.read(found.project);

  return {
    direction: found.direction,
    frames: snapshot.canvas?.frames ?? [],
    project: found.project,
  };
};

const commitOf = (deps: EditDeps, client: string): UpdateCommit => ({
  client,
  deps: {
    bus: deps.bus,
    projects: deps.projects,
    runner: deps.runner,
    versions: deps.versions,
  },
  history: deps.history ?? null,
});

const withEditErrors = async (run: () => Promise<Done>): Promise<Done> => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof TextSearchError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const runSearch = async (deps: EditDeps, input: SearchInput): Promise<Done> => {
  const target = await targetOf(deps, input);

  return withEditErrors(async () => {
    const result = await searchText(target, toSearchQuery(input));

    return { result: ok(result) };
  });
};

const updateDone = async (
  deps: EditDeps,
  target: SearchTarget,
  input: UpdateInput,
  client: string
): Promise<Done> => {
  const commit = commitOf(deps, client);
  const done = await updateText(target, toUpdateRequest(input), commit);

  if (done.version === null) {
    return { result: ok(done.result) };
  }

  const summary = `Updated ${done.result.updated} text hits in ${done.result.files.length} files`;

  return {
    activity: versionActivity(
      target.project,
      target.direction,
      summary,
      done.version
    ),
    result: ok(done.result),
  };
};

const runUpdate = async (
  deps: EditDeps,
  input: UpdateInput,
  client: string
): Promise<Done> => {
  const target = await targetOf(deps, input);

  refuseWhileRunning(deps, target.project, target.direction);

  return withEditErrors(() => updateDone(deps, target, input, client));
};

const searchTextTool = defineTool(
  "search_text",
  searchSchema,
  {
    description: SEARCH_TEXT_DESCRIPTION,
    idempotent: true,
    readOnly: true,
    title: "Search text",
  },
  runSearch
);

const updateTextTool = defineTool(
  "update_text",
  updateSchema,
  { description: UPDATE_TEXT_DESCRIPTION, title: "Update text" },
  runUpdate
);

const TEXT_SEARCH_TOOLS = [searchTextTool, updateTextTool];

export { TEXT_SEARCH_TOOLS };
