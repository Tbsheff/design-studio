import type { PreviewService } from "../preview/index.js";
import { probeOnPage } from "../preview/probe-page.js";
import { PROBE } from "./lock-probe.probe.js";

export interface LockProbe {
  found: boolean;
  key: string;
  tag: string;
  own: string[];
  inside: boolean;
  page: string;
  resolved: Record<string, boolean>;
}

const VIEWPORT = { width: 1440, height: 900 };

export function probeLock(
  preview: PreviewService,
  url: string,
  selector: string | null,
  keys: string[]
): Promise<LockProbe> {
  return probeOnPage<LockProbe>(
    preview,
    url,
    VIEWPORT,
    `(${PROBE})(${JSON.stringify({ selector, keys })})`,
    { layoutOnly: true }
  );
}

export function lockDelta(
  probe: LockProbe,
  locked: boolean
): { add: string[]; remove: string[] } {
  if (locked) {
    return { add: probe.own.length > 0 ? [] : [probe.key], remove: [] };
  }

  return { add: [], remove: [...new Set([probe.key, ...probe.own])] };
}

export function applyDelta(
  keys: string[],
  delta: { add: string[]; remove: string[] }
): string[] {
  const remove = new Set(delta.remove);

  return [...keys.filter((key) => !remove.has(key)), ...delta.add];
}

export function lockOutcome(
  probe: LockProbe,
  locked: boolean,
  count: number
): string {
  const what = `${probe.tag} on ${probe.page}`;

  if (locked) {
    return `${probe.own.length > 0 ? "Already locked" : "Locked"}: ${what}. A click on the canvas now passes through it and its children. ${count} locked layer${count === 1 ? "" : "s"} in this direction.`;
  }

  const note = probe.inside
    ? " A parent layer is still locked, so clicks still pass through it."
    : "";

  return `${probe.own.length > 0 ? "Unlocked" : "Was not locked"}: ${what}.${note} ${count} locked layer${count === 1 ? "" : "s"} in this direction.`;
}

function lockLabel(what: string): string {
  if (what.startsWith("sel:")) {
    return what.slice(4);
  }

  const use = /^use:([^|]*)\|loc:(.*)$/.exec(what);

  return use
    ? `${use[1]} (component part ${use[2]})`
    : what.replace(/^loc:/, "");
}

export function describeLocks(
  keys: string[],
  resolved: Record<string, boolean> | null,
  page: string | null
): string {
  if (keys.length === 0) {
    return "No layer is locked in this direction.";
  }

  const lines = keys.map((key) => {
    const at = key.indexOf("|");
    const where = at === -1 ? "" : key.slice(0, at);
    const what = at === -1 ? key : key.slice(at + 1);

    const state =
      resolved && where === page
        ? resolved[key]
          ? ""
          : " (not found on the page now)"
        : "";

    return `- ${where || "/"} ${lockLabel(what)}${state}`;
  });

  return `${keys.length} locked layer${keys.length === 1 ? "" : "s"} (a click on the canvas passes through a locked layer and its children):\n${lines.join("\n")}`;
}
