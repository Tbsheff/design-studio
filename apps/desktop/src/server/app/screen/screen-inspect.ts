import type {
  InspectScreenCommand,
  InspectScreenPage,
} from "./screen-model.js";
import { toInspectPlan } from "./screen-plan.js";

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

const toInspectPage = async (
  command: InspectScreenCommand
): Promise<InspectScreenPage> => {
  const { direction, project } = command;
  const plan = await toInspectPlan({ direction, project }, command.path);
  const start = toStart(command.cursor);
  const items = plan.groups.slice(start, start + command.limit);
  const end = start + items.length;
  let next: string | null = null;

  if (end < plan.groups.length) {
    next = String(end);
  }

  return {
    filePath: plan.filePath,
    groups: { items, next },
    isPathFree: plan.isPathFree,
  };
};

export { toInspectPage };
