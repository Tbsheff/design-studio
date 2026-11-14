import { isColorToken, toClassTokens } from "./class-names.js";
import { toClassPlan } from "./to-class-plan.js";
import type { ClassPlan } from "./to-class-plan.js";
import { toDriftId } from "./to-drift-id.js";
import { toSkeletonMatch } from "./to-skeleton-drift.js";
import type {
  DriftConfidence,
  DriftMatch,
  DriftSkipReason,
  DriftTag,
  KitComponent,
  RawAttribute,
  RawElement,
} from "./types.js";

interface MatchInput {
  readonly elements: readonly RawElement[];
  readonly file: string;
  readonly kit: ReadonlyMap<string, KitComponent>;
}

const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  "date",
  "datetime-local",
  "email",
  "month",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "time",
  "url",
  "week",
]);

const COMPONENT_OF: Readonly<Record<DriftTag, string>> = {
  "a-as-button": "Button",
  badge: "Badge",
  button: "Button",
  card: "Card",
  input: "Input",
  label: "Label",
  select: "NativeSelect",
  skeleton: "Skeleton",
  table: "Table",
  textarea: "Textarea",
};

const PLAIN_TAGS = new Map<string, DriftTag>([
  ["button", "button"],
  ["label", "label"],
  ["select", "select"],
  ["table", "table"],
  ["textarea", "textarea"],
]);

const BUTTON_SPACING = ["h-", "px-", "py-"];

const BLOCK_TAGS: ReadonlySet<string> = new Set(["div", "span"]);

const getAttribute = (element: RawElement, name: string): RawAttribute | null =>
  element.attributes.find((attribute) => attribute.name === name) ?? null;

const isLinkButtonLike = (element: RawElement): boolean => {
  const className = getAttribute(element, "className");

  if (getAttribute(element, "href") === null || className?.kind !== "string") {
    return false;
  }

  const tokens = toClassTokens(className.text);

  return (
    tokens.some((token) => isColorToken(token)) &&
    !tokens.includes("underline") &&
    tokens.some((token) =>
      BUTTON_SPACING.some((prefix) => token.startsWith(prefix))
    )
  );
};

const isTextInput = (element: RawElement): boolean => {
  const type = getAttribute(element, "type");

  if (type === null) {
    return true;
  }

  if (type.kind !== "string") {
    return type.kind === "expression";
  }

  return TEXT_INPUT_TYPES.has(type.text);
};

const toDriftTag = (element: RawElement): DriftTag | null => {
  if (element.tag === "input") {
    if (isTextInput(element)) {
      return "input";
    }

    return null;
  }

  if (element.tag === "a") {
    if (isLinkButtonLike(element)) {
      return "a-as-button";
    }

    return null;
  }

  return PLAIN_TAGS.get(element.tag) ?? null;
};

const toSkip = (element: RawElement, tag: DriftTag): DriftSkipReason | null => {
  if (element.attributes.some((attribute) => attribute.kind === "spread")) {
    return "spread-props";
  }

  if (tag === "select" || tag === "table") {
    return "needs-parts";
  }

  if (tag === "input" && getAttribute(element, "type")?.kind === "expression") {
    return "dynamic-tag";
  }

  return null;
};

const toConfidence = (
  tag: DriftTag,
  plan: ClassPlan,
  className: RawAttribute | null,
  skip: DriftSkipReason | null
): DriftConfidence => {
  const isPlain = tag === "input" || tag === "label" || tag === "textarea";
  const isStyled = tag === "button" && plan.suggestedVariant !== null;
  const isDynamic = className?.kind === "expression";

  if (skip !== null || isDynamic || !plan.isLayoutOnly) {
    return "medium";
  }

  if (isPlain || isStyled) {
    return "high";
  }

  return "medium";
};

const toElementMatch = (
  input: MatchInput,
  element: RawElement
): DriftMatch[] => {
  if (BLOCK_TAGS.has(element.tag)) {
    return toSkeletonMatch(input.file, input.kit, element);
  }

  const tag = toDriftTag(element);

  if (tag === null) {
    return [];
  }

  const component = COMPONENT_OF[tag];
  const kit = input.kit.get(component) ?? null;

  if (kit === null) {
    return [];
  }

  const className = getAttribute(element, "className");
  const hasVariants = tag === "button" || tag === "a-as-button";
  let tokens: string[] = [];

  if (className?.kind === "string") {
    tokens = toClassTokens(className.text);
  }

  const plan = toClassPlan(kit, tokens, hasVariants);
  const skip = toSkip(element, tag);

  const confidence = toConfidence(tag, plan, className, skip);
  const droppedClasses = plan.dropped;
  const id = toDriftId(input.file, element.line, element.column);
  const keptClasses = plan.kept;
  const { column, line } = element;
  const { file } = input;
  const { setSize, setVariant, suggestedSize, suggestedVariant } = plan;

  return [
    {
      className,
      column,
      component,
      confidence,
      droppedClasses,
      element,
      file,
      id,
      keptClasses,
      line,
      setSize,
      setVariant,
      skip,
      suggestedSize,
      suggestedVariant,
      tag,
    },
  ];
};

const toDriftMatches = (input: MatchInput): DriftMatch[] =>
  input.elements.flatMap((element) => toElementMatch(input, element));

export { toDriftMatches };

export type { MatchInput };
