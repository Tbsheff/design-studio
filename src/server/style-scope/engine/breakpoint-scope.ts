import { BREAKPOINT_BASE, BREAKPOINT_FALLBACK } from "./deps.js";
import type { BreakpointActive, BreakpointEntry } from "./deps.js";

type ScopeResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly code: string; readonly ok: false };

interface BreakpointSet {
  readonly list: readonly BreakpointEntry[];
  readonly source: "theme" | "default";
}

const byPx = (left: BreakpointEntry, right: BreakpointEntry): number =>
  left.px - right.px;

const breakpointsOf = (
  theme: ReadonlyMap<string, number> | null
): BreakpointSet => {
  if (theme === null || theme.size === 0) {
    return { list: [...BREAKPOINT_FALLBACK], source: "default" };
  }

  const list = [...theme.entries()]
    .map(([name, px]) => ({ name, px }))
    .toSorted(byPx);

  return { list, source: "theme" };
};

const activeOf = (
  list: readonly BreakpointEntry[],
  width: number,
  frameId: string | null
): BreakpointActive => {
  const hit = list.findLast((entry) => entry.px <= width) ?? null;

  if (hit === null) {
    return { breakpoint: BREAKPOINT_BASE, frame: frameId, px: null, width };
  }

  return { breakpoint: hit.name, frame: frameId, px: hit.px, width };
};

const prefixOf = (
  list: readonly BreakpointEntry[],
  scope: string
): ScopeResult<string> => {
  if (scope === BREAKPOINT_BASE) {
    return { ok: true, value: "" };
  }

  const hit = list.find((entry) => entry.name === scope);

  if (!hit) {
    const names = [BREAKPOINT_BASE, ...list.map((entry) => entry.name)];

    return {
      code: `${scope} is not a breakpoint of this project. Use one of ${names.join(", ")}.`,
      ok: false,
    };
  }

  return { ok: true, value: `${hit.name}:` };
};

const scopeOfPrefix = (prefix: string): string => {
  if (prefix === "") {
    return BREAKPOINT_BASE;
  }

  return prefix.slice(0, -1);
};

export { activeOf, breakpointsOf, prefixOf, scopeOfPrefix };

export type { BreakpointSet, ScopeResult };
