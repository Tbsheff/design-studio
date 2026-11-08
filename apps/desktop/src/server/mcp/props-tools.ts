import { inspectPropsInstanceDirectEdit } from "@design-studio/actions/direct-edit/inspect-props-instance";
import type { Project } from "@design-studio/contracts";
import type { ComponentInstance } from "@design-studio/contracts/props";

import { probeOwners } from "../page-probe/index.js";
import { callAction } from "./action-call.js";
import { EditError } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import { pageUrl } from "./edit-kit.js";

type Direction = Project["directions"][number];

export async function useSiteOf(
  deps: EditDeps,
  project: Project,
  direction: Direction,
  page: string | undefined,
  sel: string
): Promise<ComponentInstance> {
  const probed = await probeOwners(
    deps.preview,
    await pageUrl(deps, project, direction, page),
    sel
  );

  if (!probed) {
    throw new EditError(`No element matches ${sel} on the page.`);
  }

  const { instance } = await callAction<{
    instance: ComponentInstance | null;
  }>(deps, inspectPropsInstanceDirectEdit, {
    directionId: direction.id,
    owners: JSON.stringify(probed.owners),
    projectId: project.id,
    use: "null",
    usedAt: JSON.stringify(probed.usedAt ?? null),
  });

  if (!instance) {
    throw new EditError(
      `${sel} is not inside a component instance with props that the studio can find. Pass source with the file:line:col of the component's JSX tag (read_file shows it), or use edit_element for classes and text.`
    );
  }

  return instance;
}
