import { toClassTokens } from "./class-names.js";
import { toBadgeVariant } from "./to-badge-variant.js";
import { toDriftId } from "./to-drift-id.js";
import { LOOK_TAGS, toTsxCardDrift } from "./to-tsx-card-drift.js";
import type { TsxLookFind, TsxLookTag } from "./to-tsx-card-drift.js";
import type {
  DriftMatch,
  DriftSkipReason,
  KitComponent,
  RawAttribute,
  RawElement,
} from "./types.js";

interface TsxLookPlanInput {
  readonly code: string;
  readonly elements: readonly RawElement[];
  readonly file: string;
  readonly kit: ReadonlyMap<string, KitComponent>;
}

interface LookPlan {
  readonly covered: ReadonlySet<string>;
  readonly setVariant: string | null;
  readonly suggestedVariant: string | null;
}

const LOOK_COMPONENT: Readonly<Record<TsxLookTag, string>> = {
  badge: "Badge",
  card: "Card",
};

const VARIANT_PROP = "variant";
const MIN_PARTS = 2;

const BLOCK_CHILD_TAGS: ReadonlySet<string> = new Set([
  "article",
  "aside",
  "div",
  "footer",
  "header",
  "section",
]);

const LOOK_SCAN_TAGS: ReadonlySet<string> = new Set([
  ...LOOK_TAGS,
  ...BLOCK_CHILD_TAGS,
  "form",
  "main",
  "nav",
  "ol",
  "ul",
]);

const LIST_ITEM_TAG = "li";
const REF_ATTRIBUTE = "ref";
const PADDING_TOKEN = /^p[xytblrse]?-(?!0$).+$/u;

const TONE_COLOR_TOKEN =
  /^(?:bg|text|border)-(?:amber|blue|cyan|emerald|gray|green|indigo|lime|neutral|orange|red|rose|sky|slate|stone|teal|yellow|zinc)-\d+(?:\/\d+)?$/u;

const getAttribute = (element: RawElement, name: string): RawAttribute | null =>
  element.attributes.find((attribute) => attribute.name === name) ?? null;

const toStaticTokens = (element: RawElement): string[] => {
  const className = getAttribute(element, "className");

  if (className === null || className.kind !== "string") {
    return [];
  }

  return toClassTokens(className.text);
};

const isInside = (outer: RawElement, inner: RawElement): boolean =>
  outer !== inner &&
  inner.elementStart >= outer.elementStart &&
  inner.elementEnd <= outer.elementEnd;

const listDirectChildren = (
  elements: readonly RawElement[],
  parent: RawElement
): RawElement[] => {
  const inside = elements.filter((element) => isInside(parent, element));

  return inside.filter(
    (child) => !inside.some((other) => isInside(other, child))
  );
};

const isPaddedBlock = (element: RawElement): boolean =>
  BLOCK_CHILD_TAGS.has(element.tag) &&
  toStaticTokens(element).some(
    (token) => !token.includes(":") && PADDING_TOKEN.test(token)
  );

const hasParts = (
  elements: readonly RawElement[],
  element: RawElement
): boolean =>
  listDirectChildren(elements, element).filter((child) => isPaddedBlock(child))
    .length >= MIN_PARTS;

const toSkip = (
  input: TsxLookPlanInput,
  find: TsxLookFind
): DriftSkipReason | null => {
  const { element } = find;

  if (element.attributes.some((attribute) => attribute.kind === "spread")) {
    return "spread-props";
  }

  if (getAttribute(element, REF_ATTRIBUTE) !== null) {
    return "dynamic-tag";
  }

  const isCard = find.tag === "card";

  if (isCard && element.tag === LIST_ITEM_TAG) {
    return "needs-parts";
  }

  if (isCard && hasParts(input.elements, element)) {
    return "needs-parts";
  }

  return null;
};

const toVariantClasses = (kit: KitComponent, variant: string): Set<string> => {
  const found = new Set<string>(kit.base);

  for (const group of kit.groups) {
    let chosen = group.default;

    if (group.prop === VARIANT_PROP) {
      chosen = variant;
    }

    const option = group.options.find((entry) => entry.value === chosen);

    for (const token of toClassTokens(option?.classes ?? "")) {
      found.add(token);
    }
  }

  return found;
};

const toNonDefault = (kit: KitComponent, variant: string): string | null => {
  const group = kit.groups.find((entry) => entry.prop === VARIANT_PROP) ?? null;

  if (group === null || group.default === variant) {
    return null;
  }

  return variant;
};

const toBadgePlan = (
  kit: KitComponent,
  tokens: readonly string[]
): LookPlan => {
  const variant = toBadgeVariant(kit, {
    declarations: new Map(),
    hasBackground: tokens.some((token) => token.startsWith("bg-")),
    hasEdge: tokens.some((token) => token.startsWith("border")),
    tokens,
  });

  const setVariant = toNonDefault(kit, variant);
  const covered = toVariantClasses(kit, variant);

  if (setVariant !== null) {
    for (const token of tokens.filter((entry) =>
      TONE_COLOR_TOKEN.test(entry)
    )) {
      covered.add(token);
    }
  }

  return { covered, setVariant, suggestedVariant: variant };
};

const toLookPlan = (
  find: TsxLookFind,
  kit: KitComponent,
  tokens: readonly string[]
): LookPlan => {
  if (find.tag === "badge") {
    return toBadgePlan(kit, tokens);
  }

  return {
    covered: new Set(kit.base),
    setVariant: null,
    suggestedVariant: null,
  };
};

const toLookMatch = (
  input: TsxLookPlanInput,
  find: TsxLookFind
): DriftMatch[] => {
  const component = LOOK_COMPONENT[find.tag];
  const kit = input.kit.get(component) ?? null;

  if (kit === null || kit.base.length === 0) {
    return [];
  }

  const { column, element, line, tag } = find;
  const tokens = toStaticTokens(element);
  const plan = toLookPlan(find, kit, tokens);
  const skip = toSkip(input, find);
  let confidence: DriftMatch["confidence"] = "high";

  if (skip !== null) {
    confidence = "medium";
  }

  const className = getAttribute(element, "className");
  const droppedClasses = tokens.filter((token) => plan.covered.has(token));
  const { file } = input;
  const id = toDriftId(file, line, column);
  const keptClasses = tokens.filter((token) => !plan.covered.has(token));
  const setSize = null;
  const { setVariant, suggestedVariant } = plan;
  const suggestedSize = null;

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

const toTsxLookMatches = (input: TsxLookPlanInput): DriftMatch[] =>
  toTsxCardDrift({
    code: input.code,
    elements: input.elements,
    hasBadge: input.kit.has(LOOK_COMPONENT.badge),
    hasCard: input.kit.has(LOOK_COMPONENT.card),
  }).flatMap((find) => toLookMatch(input, find));

export { LOOK_COMPONENT, LOOK_SCAN_TAGS, toTsxLookMatches };

export type { TsxLookPlanInput };
