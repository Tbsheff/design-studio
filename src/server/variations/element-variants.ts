import type { Project } from "../../shared/contracts.js";
import type { ElementVariantInfo } from "../../shared/element-variants.js";
import type { AgentRunner } from "../types.js";
import { variantInfo } from "./scope.js";

const listElementVariants = async (
  project: Project,
  runner: Pick<AgentRunner, "isRunning">
): Promise<ElementVariantInfo[]> => {
  const items = await Promise.all(
    project.directions.map((direction) =>
      variantInfo(
        project,
        direction,
        runner.isRunning(project.id, direction.id)
      )
    )
  );

  return items.filter((item): item is ElementVariantInfo => item !== null);
};

export { listElementVariants };
