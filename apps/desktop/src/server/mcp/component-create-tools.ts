import { applySwapDirectEdit } from "@design-studio/actions/direct-edit/apply-swap";
import { listSwapCandidatesDirectEdit } from "@design-studio/actions/direct-edit/list-swap-candidates";

import type {
  SwapCandidateList,
  SwapResult,
} from "../../shared/component-create.js";
import { resolveSourceLoc, scopeOf } from "../page-probe/index.js";
import { z } from "../platform/zod-bridge/index.js";
import { callAction } from "./action-call.js";
import { EditError, loadTarget, refuseWhileRunning } from "./edit-guards.js";
import {
  defineTool,
  directionId,
  ok,
  pagePath,
  projectId,
  selector,
  versionActivity,
  type Done,
} from "./edit-kit.js";
import { useSiteOf } from "./props-tools.js";

export const SWAP_INSTANCE_DESCRIPTION =
  'Replace one component use with another library component, like Figma "Swap instance": <Badge variant="success">Paid</Badge> to <Button variant="outline">Paid</Button>. Props the new component also has stay (variant values that are not its options are dropped), required props it needs get defaults, the import is added and the old import goes when the file no longer uses it. Leave out name to list the components that fit (name, file, which props stay, drop or get added); only one with children can take a use that has children. One version and one undo step.';

const swapSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    selector: selector
      .optional()
      .describe(
        "CSS selector or get_layers id of an element of the component use on the page."
      ),
    source: z
      .string()
      .trim()
      .max(1100)
      .optional()
      .describe(
        'Or the use site as file:line:col of its JSX tag, for example "src/App.tsx:14:9". Use this or selector.'
      ),
    name: z
      .string()
      .regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/)
      .optional()
      .describe(
        'Component to swap to, for example "Button". Leave out to list the components that fit.'
      ),
    file: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .describe("File of that component when two have the same name."),
  })
  .strict()
  .refine(
    (input) => (input.selector === undefined) !== (input.source === undefined),
    "pass selector or source, not both"
  );

const swapInstance = defineTool(
  "swap_instance",
  swapSchema,
  { title: "Swap instance", description: SWAP_INSTANCE_DESCRIPTION },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(
      deps,
      input.projectId,
      input.directionId
    );
    if (project.kind !== "react")
      throw new EditError(
        "This is an HTML project. It has no components to swap."
      );
    const use = input.source
      ? await resolveSourceLoc(
          direction.workTree,
          scopeOf(project.id, direction.id),
          input.source
        )
      : (
          await useSiteOf(
            deps,
            project,
            direction,
            input.path,
            input.selector ?? ""
          )
        ).use;
    if (!input.name) {
      const list = await callAction<SwapCandidateList>(
        deps,
        listSwapCandidatesDirectEdit,
        { ...use, directionId: direction.id, projectId: project.id }
      );
      return { result: ok({ use, ...list }) };
    }
    refuseWhileRunning(deps, project, direction);
    let result: SwapResult;
    try {
      result = await callAction<SwapResult>(deps, applySwapDirectEdit, {
        use,
        component: {
          name: input.name,
          ...(input.file ? { file: input.file } : {}),
        },
        directionId: direction.id,
        projectId: project.id,
      });
    } catch (error) {
      throw new EditError(
        error instanceof Error ? error.message : String(error)
      );
    }
    const at = result.select.map(
      (item) => `${item.file}:${item.line}:${item.col}`
    );
    return {
      result: ok({
        file: result.file,
        title: result.title,
        at,
        dropped: result.dropped,
        added: result.added,
        importFrom: result.importFrom,
        versionId: result.version?.id ?? null,
      }),
      activity: versionActivity(
        project,
        direction,
        result.title,
        result.version
      ),
    };
  }
);

export const COMPONENT_CREATE_TOOLS = [swapInstance];
