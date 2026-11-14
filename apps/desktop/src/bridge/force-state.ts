import {
  ARIA_STATE_NAMES,
  DATA_STATE_NAMES,
  EDGE_STATE_NAMES,
  GROUP_STATE_NAMES,
  isAriaStateName,
  isDataStateName,
  isEdgeStateName,
  isGroupStateName,
  toAriaStateVariant,
  toDataStateAttribute,
} from "@design-studio/contracts/state-styles";
import type {
  AriaStateName,
  DataStateAttribute,
  DataStateName,
  EdgeStateName,
  GroupStateName,
} from "@design-studio/contracts/state-styles";

import { showEdge } from "./force-edge.js";
import {
  toGroupDataValue,
  toGroupElement,
  toGroupState,
} from "./force-group.js";

const STYLE_ID = "studio-force-state";
const ATTR = "data-studio-force";
const REBUILD_MS = 120;
const RESIZE_MS = 150;
const ALWAYS = "(min-width: 0px)";
const DARK_MEDIA = /\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g;
const DARK_TEST = /\(\s*prefers-color-scheme\s*:\s*dark\s*\)/;
const HOVER_MEDIA = /\(\s*hover\s*:\s*hover\s*\)/g;
const CLIMBING = new Set(["hover", "active"]);
const DATA_STATE_ATTR = "data-state";
const DISABLED_ITEM: DataStateAttribute = { name: "data-disabled", value: "" };

type PointerState = "hover" | "focus" | "focus-visible" | "active" | "disabled";

export type ForcedState =
  | PointerState
  | AriaStateName
  | DataStateName
  | GroupStateName
  | EdgeStateName;

const POINTER_STATES: readonly PointerState[] = [
  "hover",
  "focus",
  "focus-visible",
  "active",
  "disabled",
];

export const FORCED_STATES: readonly ForcedState[] = [
  ...POINTER_STATES,
  ...DATA_STATE_NAMES,
  ...ARIA_STATE_NAMES,
  ...GROUP_STATE_NAMES,
  ...EDGE_STATE_NAMES,
];

interface HeldDataState {
  readonly element: Element;
  readonly name: string;
  readonly old: string | null;
}

function isPointerState(state: ForcedState): state is PointerState {
  return (
    !isDataStateName(state) &&
    !isAriaStateName(state) &&
    !isGroupStateName(state) &&
    !isEdgeStateName(state)
  );
}

interface Forced {
  selector: string;
  states: ForcedState[];
  dark: boolean;
  track: boolean;
}

export interface ForceStateControl {
  set: (
    selector: string | null,
    states: ForcedState[],
    dark: boolean,
    track: boolean
  ) => void;
  schedule: () => void;
}

function stateRule(state: ForcedState): RegExp {
  return new RegExp(`:${state}(?![-\\w])`, "g");
}

function rewrite(text: string, forced: Forced): string | null {
  let out = text;
  let hit = false;

  for (const state of forced.states.filter((each) => isPointerState(each))) {
    const pattern = stateRule(state);

    if (!pattern.test(out)) {
      continue;
    }

    hit = true;
    out = out.replace(stateRule(state), `[${ATTR}~="${state}"]`);
  }

  if (forced.dark && DARK_TEST.test(out)) {
    hit = true;
    out = out.replaceAll(DARK_MEDIA, ALWAYS);
  }

  if (hit && forced.states.includes("hover")) {
    out = out.replaceAll(HOVER_MEDIA, ALWAYS);
  }

  return hit ? out : null;
}

function rulesOf(sheet: CSSStyleSheet | null): CSSRule[] {
  if (!sheet) {
    return [];
  }

  try {
    return Array.from(sheet.cssRules);
  } catch {
    return [];
  }
}

function wrapped(
  rule: CSSGroupingRule,
  head: string,
  forced: Forced,
  keepAll: boolean
): string | null {
  const inner = Array.from(rule.cssRules)
    .map(
      (child) => cloneRule(child, forced) ?? (keepAll ? child.cssText : null)
    )
    .filter((text): text is string => text !== null);

  if (inner.length === 0) {
    return null;
  }

  return head ? `${head} {\n${inner.join("\n")}\n}` : inner.join("\n");
}

function cloneMedia(rule: CSSMediaRule, forced: Forced): string | null {
  const media = rule.media.mediaText;
  const dark = forced.dark && DARK_TEST.test(media);
  const head = `@media ${dark ? media.replaceAll(DARK_MEDIA, ALWAYS) : media}`;

  return wrapped(rule, head, forced, dark);
}

function cloneRule(rule: CSSRule, forced: Forced): string | null {
  if (rule instanceof CSSStyleRule) {
    return rewrite(rule.cssText, forced);
  }

  if (rule instanceof CSSMediaRule) {
    return cloneMedia(rule, forced);
  }

  if (rule instanceof CSSSupportsRule) {
    return wrapped(rule, `@supports ${rule.conditionText}`, forced, false);
  }

  if (
    typeof CSSLayerBlockRule !== "undefined" &&
    rule instanceof CSSLayerBlockRule
  ) {
    return wrapped(rule, "", forced, false);
  }

  if (rule instanceof CSSImportRule) {
    const inner = rulesOf(rule.styleSheet)
      .map((child) => cloneRule(child, forced))
      .filter((text): text is string => text !== null);

    return inner.length > 0 ? inner.join("\n") : null;
  }

  return null;
}

function isStudioSheet(sheet: CSSStyleSheet): boolean {
  const owner = sheet.ownerNode;

  return owner instanceof Element && owner.id.startsWith("studio-");
}

function buildCss(forced: Forced): string {
  const parts: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.disabled || isStudioSheet(sheet)) {
      continue;
    }

    for (const rule of rulesOf(sheet)) {
      const text = cloneRule(rule, forced);

      if (text) {
        parts.push(text);
      }
    }
  }

  return parts.join("\n");
}

function query(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function clearMarks(): void {
  for (const element of Array.from(document.querySelectorAll(`[${ATTR}]`))) {
    element.removeAttribute(ATTR);
  }
}

function mark(element: Element, all: ForcedState[]): void {
  const states = all.filter((state) => isPointerState(state));

  if (states.length === 0) {
    return;
  }

  element.setAttribute(ATTR, states.join(" "));
  const climbing = states.filter((state) => CLIMBING.has(state));

  if (climbing.length === 0) {
    return;
  }

  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    parent.setAttribute(ATTR, climbing.join(" "));
  }
}

function styleElement(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ID);

  if (existing instanceof HTMLStyleElement) {
    return existing;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  (document.head ?? document.documentElement).appendChild(style);

  return style;
}

function restoreDataState(held: HeldDataState): void {
  if (held.old === null) {
    held.element.removeAttribute(held.name);

    return;
  }

  held.element.setAttribute(held.name, held.old);
}

function wantedDataState(
  states: readonly ForcedState[]
): DataStateAttribute | null {
  for (const state of states) {
    if (isDataStateName(state)) {
      return toDataStateAttribute(state);
    }

    if (isAriaStateName(state)) {
      return { name: toAriaStateVariant(state), value: "true" };
    }

    if (state === "disabled") {
      return DISABLED_ITEM;
    }
  }

  return null;
}

function toGroupWant(value: string | null): DataStateAttribute | null {
  if (value === null) {
    return null;
  }

  return { name: DATA_STATE_ATTR, value };
}

interface HoldResult {
  readonly held: HeldDataState | null;
  readonly isChanged: boolean;
}

function holdDataState(
  held: HeldDataState | null,
  element: Element | null,
  want: DataStateAttribute | null
): HoldResult {
  const isSame =
    held !== null && held.element === element && held.name === want?.name;
  let isChanged = false;

  if (held !== null && (!isSame || want === null)) {
    restoreDataState(held);
    isChanged = true;
  }

  if (element === null || want === null) {
    return { held: null, isChanged };
  }

  let next: HeldDataState = {
    element,
    name: want.name,
    old: element.getAttribute(want.name),
  };

  if (held !== null && isSame) {
    next = held;
  }

  if (element.getAttribute(want.name) !== want.value) {
    element.setAttribute(want.name, want.value);
    isChanged = true;
  }

  return { held: next, isChanged };
}

interface ForceTargets {
  readonly dataElement: Element | null;
  readonly element: Element | null;
  readonly group: Element | null;
  readonly isGroupHover: boolean;
  readonly pointer: PointerState[];
  readonly want: DataStateAttribute | null;
}

const NO_TARGETS: ForceTargets = {
  dataElement: null,
  element: null,
  group: null,
  isGroupHover: false,
  pointer: [],
  want: null,
};

function targetsOf(current: Forced | null): ForceTargets {
  if (current === null) {
    return NO_TARGETS;
  }

  const element = query(current.selector);
  const pointerStates = current.states.filter((state) => isPointerState(state));
  const grouped = toGroupState(current.states);

  if (grouped === null) {
    return {
      dataElement: element,
      group: null,
      isGroupHover: false,
      pointer: pointerStates,
      want: wantedDataState(current.states),
      element,
    };
  }

  const group = toGroupElement(element);

  return {
    dataElement: group,
    isGroupHover: grouped === "group-hover",
    pointer: pointerStates,
    want: toGroupWant(toGroupDataValue(grouped)),
    element,
    group,
  };
}

function cssStatesOf(targets: ForceTargets): ForcedState[] {
  if (targets.isGroupHover && targets.group !== null) {
    return [...targets.pointer, "hover"];
  }

  return targets.pointer;
}

export function createForceState(onChanged: () => void): ForceStateControl {
  let forced: Forced | null = null;
  let held: HeldDataState | null = null;
  let timer = 0;
  let resizeTimer = 0;

  const apply = (): boolean => {
    clearMarks();
    const current = forced;
    const targets = targetsOf(current);
    showEdge(targets.element, current?.states ?? []);
    const hold = holdDataState(held, targets.dataElement, targets.want);
    ({ held } = hold);
    const states = cssStatesOf(targets);
    const needed = current !== null && (states.length > 0 || current.dark);

    if (!current || !needed) {
      document.getElementById(STYLE_ID)?.remove();

      return hold.isChanged;
    }

    if (targets.element && targets.pointer.length > 0) {
      mark(targets.element, targets.pointer);
    }

    if (targets.isGroupHover && targets.group !== null) {
      mark(targets.group, ["hover"]);
    }

    const css = buildCss({ ...current, states });
    const style = styleElement();

    if (style.textContent === css) {
      return hold.isChanged;
    }

    style.textContent = css;

    return true;
  };

  const onResize = (): void => {
    if (!forced?.track) {
      return;
    }

    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(onChanged, RESIZE_MS);
  };

  window.addEventListener("resize", onResize, { passive: true });

  return {
    set: (selector, states, dark, track) => {
      forced = selector ? { selector, states, dark, track } : null;
      apply();
    },
    schedule: () => {
      if (!forced) {
        return;
      }

      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (apply()) {
          onChanged();
        }
      }, REBUILD_MS);
    },
  };
}
