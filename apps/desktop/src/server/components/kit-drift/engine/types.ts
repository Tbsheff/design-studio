type DriftTag =
  | "a-as-button"
  | "badge"
  | "button"
  | "card"
  | "input"
  | "label"
  | "select"
  | "skeleton"
  | "table"
  | "textarea";

type DriftConfidence = "high" | "medium";

type DriftSkipReason =
  | "dynamic-tag"
  | "needs-parts"
  | "name-clash"
  | "parse-failed"
  | "spread-props";

type AttributeKind = "expression" | "flag" | "spread" | "string";

type ChildKind = "elements" | "empty" | "text";

interface RawAttribute {
  readonly end: number;
  readonly kind: AttributeKind;
  readonly name: string;
  readonly start: number;
  readonly text: string;
}

interface RawElement {
  readonly attributes: readonly RawAttribute[];
  readonly childKind: ChildKind;
  readonly closeNameEnd: number | null;
  readonly closeNameStart: number | null;
  readonly column: number;
  readonly elementEnd: number;
  readonly elementStart: number;
  readonly line: number;
  readonly nameEnd: number;
  readonly nameStart: number;
  readonly tag: string;
}

interface KitVariantOption {
  readonly classes: string;
  readonly value: string;
}

interface KitVariantGroup {
  readonly default: string | null;
  readonly options: readonly KitVariantOption[];
  readonly prop: string;
}

interface KitComponent {
  readonly base: readonly string[];
  readonly groups: readonly KitVariantGroup[];
  readonly name: string;
}

interface DriftMatch {
  readonly className: RawAttribute | null;
  readonly column: number;
  readonly component: string;
  readonly confidence: DriftConfidence;
  readonly droppedClasses: readonly string[];
  readonly element: RawElement;
  readonly file: string;
  readonly id: string;
  readonly keptClasses: readonly string[];
  readonly line: number;
  readonly setSize: string | null;
  readonly setVariant: string | null;
  readonly skip: DriftSkipReason | null;
  readonly suggestedSize: string | null;
  readonly suggestedVariant: string | null;
  readonly tag: DriftTag;
}

interface Splice {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

export type {
  AttributeKind,
  ChildKind,
  DriftConfidence,
  DriftMatch,
  DriftSkipReason,
  DriftTag,
  KitComponent,
  KitVariantGroup,
  KitVariantOption,
  RawAttribute,
  RawElement,
  Splice,
};
