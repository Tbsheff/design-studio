import type { ElementVariantInfo } from "@design-studio/contracts/element-variants";

import type { StudioProjectStore } from "../store/projects.js";
import type { AgentRunner } from "../types.js";
import { listElementVariants } from "../variations/element-variants.js";

interface VariantListQuery {
  readonly projectId: string;
}

const NO_RUNNER: Pick<AgentRunner, "isRunning"> = { isRunning: () => false };

const readVariantList = async (
  projects: StudioProjectStore,
  runner: Pick<AgentRunner, "isRunning"> | null,
  query: VariantListQuery
): Promise<readonly ElementVariantInfo[]> => {
  const project = await projects.get(query.projectId);

  return listElementVariants(project, runner ?? NO_RUNNER);
};

export { readVariantList };

export type { VariantListQuery };
