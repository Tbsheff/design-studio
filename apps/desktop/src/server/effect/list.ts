import type { EffectStyle } from "./deps.js";
import { toStyle } from "./get.js";
import type { EffectScope } from "./set-plan.js";
import { getSheet, toSheetRules } from "./sheet.js";

interface EffectPageCommand {
  readonly cursor: string | null;
  readonly limit: number;
}

interface EffectPage {
  readonly items: readonly EffectStyle[];
  readonly next: string | null;
}

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start > 0) {
    return start;
  }

  return 0;
};

const listEffectStyles = async (
  scope: EffectScope,
  command: EffectPageCommand
): Promise<EffectPage> => {
  const sheet = await getSheet(scope.workTree);

  if (sheet === null) {
    return { items: [], next: null };
  }

  const styles = toSheetRules(sheet.text)
    .filter((rule) => rule.name !== null)
    .map((rule) => toStyle(rule, sheet.relative))
    .toSorted((left, right) => left.name.localeCompare(right.name));

  const start = toStart(command.cursor);
  const end = start + command.limit;
  let next: string | null = null;

  if (end < styles.length) {
    next = String(end);
  }

  return { items: styles.slice(start, end), next };
};

export { listEffectStyles };

export type { EffectPage, EffectPageCommand };
