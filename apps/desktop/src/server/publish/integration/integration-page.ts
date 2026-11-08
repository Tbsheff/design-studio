import type {
  IntegrationListCommand,
  IntegrationPage,
  StoredIntegration,
} from "./integration-model.js";

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

const toIntegrationPage = (
  all: readonly StoredIntegration[],
  command: IntegrationListCommand
): IntegrationPage => {
  const start = toStart(command.cursor);
  const items = all.slice(start, start + command.limit);
  const end = start + items.length;
  let next: string | null = null;

  if (end < all.length) {
    next = String(end);
  }

  return { items, next };
};

export { toIntegrationPage };
