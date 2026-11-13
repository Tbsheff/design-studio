import type { LinksFile, PrototypeLink } from "@design-studio/contracts/links";

import { readImplicitList } from "./link-ops.js";
import { runtimeOf } from "./link-runtime.js";

interface PlayLinks {
  readonly implicit: readonly PrototypeLink[];
  readonly links: LinksFile;
}

const toPlayLinks = async (projectId: string): Promise<PlayLinks | null> => {
  const runtime = runtimeOf();

  if (runtime === null) {
    return null;
  }

  const project = await runtime.projects.get(projectId);

  const [links, implicit] = await Promise.all([
    runtime.canvas.links.read(project),
    readImplicitList(runtime, projectId),
  ]);

  return { implicit, links };
};

export { toPlayLinks };

export type { PlayLinks };
