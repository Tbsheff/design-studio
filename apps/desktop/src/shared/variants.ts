import {
  ARIA_STATE_NAMES,
  DATA_STATE_NAMES,
  EDGE_STATE_NAMES,
  fromAriaStateVariant,
  fromDataStateVariant,
  fromGroupVariant,
  GROUP_STATE_NAMES,
  isAriaStateName,
  isDataStateName,
  isEdgeStateName,
  isGroupStateName,
  toAriaStateVariant,
  toDataStateVariant,
  toGroupVariant,
} from "@design-studio/contracts/state-styles";

export const VARIANT_STATES = ["hover", "focus", "active"] as const;

export type VariantState = (typeof VARIANT_STATES)[number];

const POINTER_STATES = [
  ...VARIANT_STATES,
  "focus-visible",
  "disabled",
] as const;

export const PSEUDO_STATES = [
  ...DATA_STATE_NAMES,
  ...ARIA_STATE_NAMES,
  ...GROUP_STATE_NAMES,
  ...POINTER_STATES,
  ...EDGE_STATE_NAMES,
] as const;

export type PseudoState = (typeof PSEUDO_STATES)[number];

export const DEFAULT_BREAKPOINTS: readonly Breakpoint[] = [
  { name: "sm", px: 640 },
  { name: "md", px: 768 },
  { name: "lg", px: 1024 },
  { name: "xl", px: 1280 },
  { name: "2xl", px: 1536 },
];

export interface Breakpoint {
  name: string;
  px: number;
}

export interface ParsedVariant {
  breakpoint: string | null;
  dark: boolean;
  group: string | null;
  states: PseudoState[];
}

export interface VariantSupport {
  mode: "classes" | "css" | "none";
  reason: string | null;
  breakpoints: Breakpoint[];
  props: string[];
  set: string[];
}

const PART = /^[a-z0-9][a-z0-9-]*$/;
const MAX_VARIANT = 60;

function isState(part: string): part is PseudoState {
  return (POINTER_STATES as readonly string[]).includes(part);
}

function stateOfPart(part: string): PseudoState | null {
  const grouped = fromGroupVariant(part);

  if (grouped !== null) {
    return grouped.state;
  }

  if (isState(part) || isEdgeStateName(part)) {
    return part;
  }

  return fromDataStateVariant(part) ?? fromAriaStateVariant(part);
}

function toVariantPart(state: PseudoState, group: string | null): string {
  if (isGroupStateName(state)) {
    return toGroupVariant(state, group);
  }

  if (isDataStateName(state)) {
    return toDataStateVariant(state);
  }

  if (isAriaStateName(state)) {
    return toAriaStateVariant(state);
  }

  return state;
}

export function parseVariant(raw: string): ParsedVariant | null {
  const text = raw.trim();

  if (text === "" || text === "base") {
    return { breakpoint: null, dark: false, group: null, states: [] };
  }

  if (text.length > MAX_VARIANT) {
    return null;
  }

  const parts = text.split(/[:+\s]+/).filter(Boolean);
  const out: ParsedVariant = {
    breakpoint: null,
    dark: false,
    group: null,
    states: [],
  };

  for (const part of parts) {
    const state = stateOfPart(part);
    out.group = fromGroupVariant(part)?.name ?? out.group;

    if (state === null && !PART.test(part)) {
      return null;
    }

    if (part === "dark") {
      out.dark = true;
    } else if (state !== null) {
      if (!out.states.includes(state)) {
        out.states.push(state);
      }
    } else if (out.breakpoint === null) {
      out.breakpoint = part;
    } else {
      return null;
    }
  }

  out.states.sort(
    (a, b) => PSEUDO_STATES.indexOf(a) - PSEUDO_STATES.indexOf(b)
  );

  return out;
}

export function variantPrefix(variant: ParsedVariant): string {
  const parts = [
    ...(variant.breakpoint ? [variant.breakpoint] : []),
    ...(variant.dark ? ["dark"] : []),
    ...variant.states.map((state) => toVariantPart(state, variant.group)),
  ];

  return parts.map((part) => `${part}:`).join("");
}

export function normalizeVariant(
  raw: string | undefined | null
): string | null {
  if (raw === undefined || raw === null) {
    return "";
  }

  const parsed = parseVariant(raw);

  return parsed ? variantPrefix(parsed) : null;
}

export function variantLabel(prefix: string): string {
  return prefix === "" ? "Base" : prefix.slice(0, -1).split(":").join(" + ");
}
