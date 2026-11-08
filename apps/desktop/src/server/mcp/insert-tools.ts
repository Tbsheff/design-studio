import type { Project } from "@design-studio/contracts";
import type { InsertTarget } from "@design-studio/contracts/insert";

import {
  describeElement,
  probeOwners,
  resolveSourceLoc,
  scopeOf,
} from "../page-probe/index.js";
import { EditError } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import { pageUrl } from "./edit-kit.js";

type Direction = Project["directions"][number];

export interface TargetInput {
  targetSelector?: string | undefined;
  targetSource?: string | undefined;
  path?: string | undefined;
}

export async function targetOf(
  deps: Pick<EditDeps, "preview">,
  project: Project,
  direction: Direction,
  input: TargetInput
): Promise<InsertTarget> {
  if (input.targetSource) {
    return {
      source: await resolveSourceLoc(
        direction.workTree,
        scopeOf(project.id, direction.id),
        input.targetSource
      ),
    };
  }

  const sel = input.targetSelector ?? "";
  const url = await pageUrl(deps, project, direction, input.path);
  const element = await describeElement(deps.preview, url, sel);

  if (!element) {
    throw new EditError(`No element matches ${sel} on the page.`);
  }

  const probed = await probeOwners(deps.preview, url, sel).catch(() => null);

  if (!element.source && !probed?.owners.length) {
    throw new EditError(
      `${sel} has no source location. Pass targetSource with the file:line:col of the JSX tag.`
    );
  }

  return {
    source: element.source,
    tag: element.tag,
    selector: sel,
    ...(probed?.owners.length ? { owners: probed.owners } : {}),
  };
}
