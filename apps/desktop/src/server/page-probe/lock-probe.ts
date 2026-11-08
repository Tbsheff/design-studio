import type { PreviewService } from "../preview/index.js";
import { probeOnPage } from "../preview/probe-page.js";
import { LOCK_PROBE_SOURCE } from "../preview/probe-source/index.js";
import { toChoice } from "./choice.js";

interface LockProbe {
  found: boolean;
  key: string;
  tag: string;
  own: string[];
  inside: boolean;
  page: string;
  resolved: Record<string, boolean>;
}

interface LockDelta {
  add: string[];
  remove: string[];
}

const SELECTOR_PREFIX = "sel:";
const VIEWPORT = { height: 900, width: 1440 };

const probeLock = (
  preview: PreviewService,
  url: string,
  selector: string | null,
  keys: string[]
): Promise<LockProbe> =>
  probeOnPage<LockProbe>(
    preview,
    url,
    VIEWPORT,
    `(${LOCK_PROBE_SOURCE})(${JSON.stringify({ keys, selector })})`,
    { layoutOnly: true }
  );

const lockDelta = (probe: LockProbe, locked: boolean): LockDelta => {
  if (locked) {
    return { add: toChoice(probe.own.length > 0, [], [probe.key]), remove: [] };
  }

  return { add: [], remove: [...new Set([probe.key, ...probe.own])] };
};

const applyDelta = (keys: string[], delta: LockDelta): string[] => {
  const remove = new Set(delta.remove);

  return [...keys.filter((key) => !remove.has(key)), ...delta.add];
};

const toLockedCount = (count: number): string =>
  `${count} locked layer${toChoice(count === 1, "", "s")} in this direction.`;

const lockOutcome = (
  probe: LockProbe,
  locked: boolean,
  count: number
): string => {
  const what = `${probe.tag} on ${probe.page}`;
  const isOwn = probe.own.length > 0;

  if (locked) {
    const head = toChoice(isOwn, "Already locked", "Locked");

    return `${head}: ${what}. A click on the canvas now passes through it and its children. ${toLockedCount(count)}`;
  }

  const note = toChoice(
    probe.inside,
    " A parent layer is still locked, so clicks still pass through it.",
    ""
  );

  const head = toChoice(isOwn, "Unlocked", "Was not locked");

  return `${head}: ${what}.${note} ${toLockedCount(count)}`;
};

const lockLabel = (what: string): string => {
  if (what.startsWith(SELECTOR_PREFIX)) {
    return what.slice(SELECTOR_PREFIX.length);
  }

  const use = /^use:(?<name>[^|]*)\|loc:(?<loc>.*)$/u.exec(what);

  if (use) {
    return `${use[1]} (component part ${use[2]})`;
  }

  return what.replace(/^loc:/u, "");
};

const toLockState = (
  resolved: Record<string, boolean> | null,
  key: string,
  isOnPage: boolean
): string => {
  if (!resolved || !isOnPage || resolved[key]) {
    return "";
  }

  return " (not found on the page now)";
};

const describeLocks = (
  keys: string[],
  resolved: Record<string, boolean> | null,
  page: string | null
): string => {
  if (keys.length === 0) {
    return "No layer is locked in this direction.";
  }

  const lines = keys.map((key) => {
    const at = key.indexOf("|");
    const where = toChoice(at === -1, "", key.slice(0, at));
    const what = toChoice(at === -1, key, key.slice(at + 1));
    const state = toLockState(resolved, key, where === page);

    return `- ${where || "/"} ${lockLabel(what)}${state}`;
  });

  const count = `${keys.length} locked layer${toChoice(keys.length === 1, "", "s")}`;

  return `${count} (a click on the canvas passes through a locked layer and its children):\n${lines.join("\n")}`;
};

export { probeLock, lockDelta, applyDelta, lockOutcome, describeLocks };

export type { LockProbe };
