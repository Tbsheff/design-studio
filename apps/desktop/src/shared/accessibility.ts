import type { SourceLoc } from "@design-studio/contracts";

const ACCESSIBILITY_ROLES = [
  "alert",
  "button",
  "checkbox",
  "dialog",
  "img",
  "link",
  "list",
  "listitem",
  "main",
  "navigation",
  "none",
  "presentation",
  "radio",
  "region",
  "search",
  "status",
  "switch",
  "tab",
  "tablist",
  "tabpanel",
  "textbox",
] as const;

const NAME_SOURCES = [
  "aria-labelledby",
  "aria-label",
  "alt",
  "label",
  "title",
  "text",
  "placeholder",
  "none",
] as const;

const ACCESSIBILITY_LIST_MAX = 200;

const ACCESSIBILITY_LABEL_MAX = 300;

const TAB_INDEX_MIN = -1;

const TAB_INDEX_MAX = 32_767;

type AccessibilityRole = (typeof ACCESSIBILITY_ROLES)[number];

type NameSource = (typeof NAME_SOURCES)[number];

interface AccessibleNode {
  readonly name: string;
  readonly nameFrom: NameSource;
  readonly role: string;
  readonly selector: string;
  readonly source: SourceLoc | null;
  readonly tag: string;
}

interface TabStop extends AccessibleNode {
  readonly order: number;
  readonly tabIndex: number;
}

interface MissingAlt {
  readonly selector: string;
  readonly source: SourceLoc | null;
  readonly src: string;
  readonly tag: string;
}

interface ContrastFixMatch {
  readonly property: "color";
  readonly selector: string;
  readonly source: SourceLoc;
  readonly tag: string;
}

interface ContrastFix {
  readonly frame: string;
  readonly matches: readonly ContrastFixMatch[];
  readonly token: string;
  readonly tool: "replace_style";
}

interface PassingTokenInfo {
  readonly cssVar: string;
  readonly hex: string;
  readonly ratio: number;
}

interface ContrastPair {
  readonly background: string;
  readonly fix: ContrastFix | null;
  readonly foreground: string;
  readonly large: boolean;
  readonly need: number;
  readonly passes: boolean;
  readonly ratio: number;
  readonly selector: string;
  readonly source: SourceLoc | null;
  readonly tag: string;
  readonly text: string;
  readonly token: PassingTokenInfo | null;
}

interface AccessibilityReport {
  readonly contrast: readonly ContrastPair[];
  readonly frame: string;
  readonly lowContrast: number;
  readonly missingAlt: readonly MissingAlt[];
  readonly page: string;
  readonly root: AccessibleNode | null;
  readonly tabOrder: readonly TabStop[];
  readonly truncated: boolean;
  readonly unnamed: readonly AccessibleNode[];
}

interface AccessibilityChanges {
  readonly alt?: string | null;
  readonly ariaLabel?: string | null;
  readonly role?: AccessibilityRole | null;
  readonly tabIndex?: number | null;
}

interface AccessibilitySetResult {
  readonly attributes: Readonly<Record<string, string | null>>;
  readonly file: string;
  readonly site: "element" | "use";
  readonly source: SourceLoc;
  readonly title: string;
  readonly versionId: string | null;
}

export {
  ACCESSIBILITY_LABEL_MAX,
  ACCESSIBILITY_LIST_MAX,
  ACCESSIBILITY_ROLES,
  NAME_SOURCES,
  TAB_INDEX_MAX,
  TAB_INDEX_MIN,
};

export type {
  AccessibilityChanges,
  AccessibilityReport,
  AccessibilityRole,
  AccessibilitySetResult,
  AccessibleNode,
  ContrastFix,
  ContrastFixMatch,
  ContrastPair,
  MissingAlt,
  NameSource,
  PassingTokenInfo,
  TabStop,
};
