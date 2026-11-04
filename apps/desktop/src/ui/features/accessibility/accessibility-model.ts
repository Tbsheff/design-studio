import type {
  AccessibilityChanges,
  AccessibilityReport,
  ContrastPair,
  TabStop,
} from "./deps.js";

interface AccessibilityAttrs {
  readonly alt: string | null;
  readonly ariaLabel: string;
  readonly role: string;
  readonly tabIndex: string;
}

interface ContrastLevels {
  readonly aa: boolean;
  readonly aaa: boolean;
}

interface BadgeStop {
  readonly isUnnamed: boolean;
  readonly name: string;
  readonly order: number;
  readonly selector: string;
}

const AA_NORMAL = 4.5;

const AA_LARGE = 3;

const AAA_NORMAL = 7;

const AAA_LARGE = 4.5;

const IMAGE_TAGS = new Set(["img", "area", "input"]);

const EMPTY_ATTRS: AccessibilityAttrs = {
  alt: null,
  ariaLabel: "",
  role: "",
  tabIndex: "",
};

const firstElementOf = (outerHTML: string): Element | null => {
  if (outerHTML.trim() === "") {
    return null;
  }

  const parsed = new DOMParser().parseFromString(outerHTML, "text/html");

  return parsed.body.firstElementChild;
};

const attrsOf = (outerHTML: string): AccessibilityAttrs => {
  const element = firstElementOf(outerHTML);

  if (element === null) {
    return EMPTY_ATTRS;
  }

  return {
    alt: element.getAttribute("alt"),
    ariaLabel: element.getAttribute("aria-label") ?? "",
    role: element.getAttribute("role") ?? "",
    tabIndex: element.getAttribute("tabindex") ?? "",
  };
};

const isImageTag = (tag: string): boolean => IMAGE_TAGS.has(tag.toLowerCase());

const levelsOf = (pair: ContrastPair): ContrastLevels => {
  if (pair.large) {
    return { aa: pair.ratio >= AA_LARGE, aaa: pair.ratio >= AAA_LARGE };
  }

  return { aa: pair.ratio >= AA_NORMAL, aaa: pair.ratio >= AAA_NORMAL };
};

const pairOf = (
  report: AccessibilityReport | null,
  selector: string
): ContrastPair | null => {
  if (report === null) {
    return null;
  }

  const own = report.contrast.find((pair) => pair.selector === selector);

  return own ?? report.contrast[0] ?? null;
};

const labelChange = (raw: string): AccessibilityChanges => {
  const text = raw.trim();

  if (text === "") {
    return { ariaLabel: null };
  }

  return { ariaLabel: text };
};

const roleChange = (raw: string): AccessibilityChanges => {
  if (raw === "") {
    return { role: null };
  }

  return { role: raw as NonNullable<AccessibilityChanges["role"]> };
};

const tabIndexChange = (raw: string): AccessibilityChanges | null => {
  const text = raw.trim();

  if (text === "") {
    return { tabIndex: null };
  }

  const value = Number(text);

  if (!Number.isInteger(value)) {
    return null;
  }

  return { tabIndex: value };
};

const badgesOf = (report: AccessibilityReport | null): BadgeStop[] => {
  if (report === null) {
    return [];
  }

  const unnamed = new Set(report.unnamed.map((node) => node.selector));

  return report.tabOrder.map((stop: TabStop) => ({
    isUnnamed: unnamed.has(stop.selector) || stop.name.trim() === "",
    name: stop.name,
    order: stop.order,
    selector: stop.selector,
  }));
};

const badgeIdOf = (order: number): string => `a11y-tab-${order}`;

export {
  attrsOf,
  badgeIdOf,
  badgesOf,
  isImageTag,
  labelChange,
  levelsOf,
  pairOf,
  roleChange,
  tabIndexChange,
};

export type { AccessibilityAttrs, BadgeStop, ContrastLevels };
