import { z } from "zod";

import {
  ICON_COLOR,
  ICON_LIST_DEFAULT,
  ICON_LIST_MAX,
  ICON_NAME,
  ICON_POSITIONS,
  ICON_QUERY_MAX,
  ICON_SIZE_DEFAULT,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
  ICON_SOURCE_MAX,
  ICON_SOURCES,
} from "../../shared/icons.js";
import { applyIconInsert } from "../icons/apply.js";
import type { IconEditScope, IconInsertResult } from "../icons/apply.js";
import type { IconInsertRequest } from "../icons/insert.js";
import { listIcons } from "../icons/list.js";
import { IconError } from "../icons/set.js";
import { EditError, loadTarget, refuseWhileRunning } from "./edit-deps.js";
import type { EditDeps } from "./edit-deps.js";
import {
  defineTool,
  directionId as directionIdSchema,
  ok,
  pagePath,
  pageUrl,
  plain,
  projectId as projectIdSchema,
  selector,
  versionActivity,
} from "./edit-kit.js";
import type { Done } from "./edit-kit.js";
import { targetOf } from "./insert-tools.js";

const librarySchema = z
  .enum(ICON_SOURCES)
  .optional()
  .describe(
    'Icon library. Leave out to use the one the project has installed (lucide-react, @heroicons/react or @tabler/icons-react), or the bundled lucide set ("lucide") when it has none.'
  );

const listSchema = z.strictObject({
  directionId: directionIdSchema,
  library: librarySchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(ICON_LIST_MAX)
    .default(ICON_LIST_DEFAULT)
    .describe(`Most icons to return, up to ${ICON_LIST_MAX}.`),
  projectId: projectIdSchema,
  query: z
    .string()
    .trim()
    .max(ICON_QUERY_MAX)
    .optional()
    .describe('Part of an icon name, for example "search" or "arrow".'),
});

const insertFields = z.strictObject({
  color: z
    .string()
    .trim()
    .regex(ICON_COLOR)
    .optional()
    .describe(
      'Color token name, for example "primary" or "muted-foreground". Library icons get text-<token>; inline SVG gets color: var(--<token>). Leave out to keep currentColor.'
    ),
  directionId: directionIdSchema,
  library: librarySchema,
  name: z
    .string()
    .trim()
    .regex(ICON_NAME)
    .describe(
      'Icon name from list_icons, for example "search", "Search" or "SearchIcon".'
    ),
  path: pagePath,
  position: z
    .enum(ICON_POSITIONS)
    .default("inside")
    .describe("inside: last child of the target. before / after: a sibling."),
  projectId: projectIdSchema,
  size: z
    .number()
    .int()
    .min(ICON_SIZE_MIN)
    .max(ICON_SIZE_MAX)
    .default(ICON_SIZE_DEFAULT)
    .describe("Size in px. A library icon gets the Tailwind class size-N."),
  targetSelector: selector
    .optional()
    .describe(
      "CSS selector or layer id of the element to insert into, before or after. When it is an icon, the new icon replaces it."
    ),
  targetSource: z
    .string()
    .trim()
    .max(ICON_SOURCE_MAX)
    .optional()
    .describe(
      "Or the element as file:line:col of its tag, as get_layers prints it."
    ),
});

const insertSchema = insertFields.refine(
  (input) => Boolean(input.targetSelector) !== Boolean(input.targetSource),
  "pass targetSelector or targetSource, not both"
);

type InsertInput = z.output<typeof insertSchema>;

const previewOrigin = async (
  deps: EditDeps,
  scope: Omit<IconEditScope, "previewOrigin" | "workTree">,
  page: string | undefined
): Promise<string | null> => {
  if (scope.project.kind !== "react") {
    return null;
  }

  try {
    const url = await pageUrl(deps, scope.project, scope.direction, page);

    return new URL(url).origin;
  } catch {
    return null;
  }
};

const editScope = async (
  deps: EditDeps,
  input: InsertInput
): Promise<IconEditScope> => {
  const found = await loadTarget(deps, input.projectId, input.directionId);
  const origin = await previewOrigin(deps, found, input.path);

  return {
    direction: found.direction,
    previewOrigin: origin,
    project: found.project,
    workTree: found.direction.workTree,
  };
};

const insertRequest = async (
  deps: EditDeps,
  scope: IconEditScope,
  input: InsertInput
): Promise<IconInsertRequest> => {
  const target = await targetOf(deps, scope.project, scope.direction, input);

  return {
    color: input.color,
    library: input.library,
    name: input.name,
    position: input.position,
    size: input.size,
    target,
  };
};

const insertReply = (scope: IconEditScope, done: IconInsertResult): Done => {
  const { plan, version } = done;
  const [at] = plan.select;
  const place = at && `${at.file}:${at.line}:${at.col}`;

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      plan.title,
      version
    ),
    result: ok({
      at: place || null,
      file: plan.target.relative,
      icon: plan.icon,
      importAdded: plan.importAdded,
      importFrom: plan.importFrom,
      library: plan.library,
      markup: plan.markup,
      swapped: plan.swapped,
      title: version.title,
      versionId: version.id,
    }),
  };
};

const listIconsTool = defineTool(
  "list_icons",
  listSchema,
  {
    description:
      "Search the icons that insert_icon can add. In a React project or attached app it reads the icon library the project has installed (lucide-react, @heroicons/react or @tabler/icons-react) from node_modules; HTML projects and projects with no icon library get a bundled set of about 360 lucide icons (ISC license). Returns name, library, the React component name (null for inline SVG) and an SVG preview. Read only.",
    readOnly: true,
    title: "List icons",
  },
  async (deps, input): Promise<Done> => {
    const { direction, project } = await loadTarget(
      deps,
      input.projectId,
      input.directionId
    );

    try {
      const list = await listIcons(
        { project, workTree: direction.workTree },
        input
      );

      return plain(ok(list));
    } catch (error) {
      if (error instanceof IconError) {
        throw new EditError(error.message);
      }

      throw error;
    }
  }
);

const insertIconTool = defineTool(
  "insert_icon",
  insertSchema,
  {
    description:
      'Insert an icon inside, before or after an element. In a React project with an icon library it writes <SearchIcon className="size-4" /> and adds or extends the import line; otherwise it writes an inline <svg> with stroke="currentColor". When the target is already an icon (an <svg> or an icon component), the new icon replaces it. One version and one undo step.',
    title: "Insert icon",
  },
  async (deps, input): Promise<Done> => {
    const scope = await editScope(deps, input);

    refuseWhileRunning(deps, scope.project, scope.direction);

    try {
      const request = await insertRequest(deps, scope, input);
      const done = await applyIconInsert(deps, scope, request);

      return insertReply(scope, done);
    } catch (error) {
      if (error instanceof IconError) {
        throw new EditError(error.message);
      }

      throw error;
    }
  }
);

const ICON_TOOLS = [listIconsTool, insertIconTool];

export { ICON_TOOLS };
