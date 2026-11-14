import type { AppReviewRecord } from "@design-studio/contracts";

import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import type {
  DriftTag,
  MarkupDrift,
  PackRecipe,
} from "../components/kit-drift/engine/index.js";
import {
  isKitPrototype,
  listPrototypeDrift,
} from "../components/kit-drift/kit-drift-prototype.js";
import type { PrototypeDrift } from "../components/kit-drift/kit-drift-prototype.js";
import type { AppReviewGaps } from "./final-check.js";

interface KitGroup {
  readonly finds: readonly MarkupDrift[];
  readonly key: string;
}

interface KitTally {
  readonly first: number;
  readonly last: number;
  readonly passes: number;
}

type KitContext = Pick<AgentRunContext, "direction" | "project" | "request">;

const KIT_COUNTS = new WeakMap<KitContext, number[]>();

const LISTED_LINES = 6;

const RENDER_SKIPPED_LINE =
  "- The studio could not render the pages, so it skipped the rendered scan and checked the static HTML only.";

const MOBILE_RAN =
  "a mobile screenshot at 390 px wide, 2400 px tall so content in inner scroll areas shows (attached)";

const REVIEW_RAN =
  "review_frame on the context frame at its size and at 390 px";

const TAG_WORDS: Readonly<Record<DriftTag, string>> = {
  "a-as-button": "link styled as a button",
  badge: "badge",
  button: "button",
  card: "card",
  input: "input",
  label: "label",
  select: "select",
  table: "table",
  textarea: "text area",
};

const PLURAL_WORDS: Readonly<Record<DriftTag, string>> = {
  "a-as-button": "links styled as buttons",
  badge: "badges",
  button: "buttons",
  card: "cards",
  input: "inputs",
  label: "labels",
  select: "selects",
  table: "tables",
  textarea: "text areas",
};

const isKitRun = (ctx: KitContext): boolean =>
  isKitPrototype(ctx.project) && ctx.request.mode === "edit";

const isKitOnly = (gaps: AppReviewGaps): boolean =>
  !gaps.mobile && !gaps.review;

const toGroups = (finds: readonly MarkupDrift[]): KitGroup[] => {
  const groups = new Map<string, MarkupDrift[]>();

  for (const find of finds) {
    const key = `${find.tag}|${find.recipe.component.name}|${String(find.isScriptBuilt)}`;

    groups.set(key, [...(groups.get(key) ?? []), find]);
  }

  return [...groups.entries()].map(([key, list]) => ({ finds: list, key }));
};

const toPlaces = (finds: readonly MarkupDrift[]): string =>
  [...new Set(finds.map((find) => `${find.file}:${find.line}`))]
    .slice(0, LISTED_LINES)
    .join(", ");

const toCount = (group: KitGroup, tag: DriftTag): string => {
  const count = group.finds.length;

  if (count === 1) {
    return `${count} ${TAG_WORDS[tag]} is`;
  }

  return `${count} ${PLURAL_WORDS[tag]} are`;
};

const toRecipeText = (recipe: PackRecipe): string => {
  const classes = `${recipe.component.name} \`${recipe.component.base.join(" ")}\``;

  if (recipe.slot === null) {
    return classes;
  }

  return `${classes} with data-slot="${recipe.slot}"`;
};

const listPartRecipes = (group: KitGroup): PackRecipe[] => {
  const found = new Map<string, PackRecipe>();

  for (const part of group.finds.flatMap((find) => find.parts)) {
    found.set(part.component.name, part);
  }

  return [...found.values()];
};

const toCardLine = (group: KitGroup, first: MarkupDrift): string => {
  const parts = listPartRecipes(group);
  const names = parts.map((part) => part.component.name).join(", ");
  let partText = "";
  let nameText = "";

  if (names !== "") {
    nameText = ` (${names})`;
  }

  if (parts.length > 0) {
    partText = ` Give each part its recipe: ${parts.map((part) => toRecipeText(part)).join("; ")}.`;
  }

  return `- ${toCount(group, "card")} hand-styled (${toPlaces(group.finds)}). Replace the hand-styled card with the app Card${nameText}; keep the content. Give the outer block ${toRecipeText(first.recipe)}.${partText} Keep the page CSS for the look, so Move to app maps it to Card.`;
};

const listBadgeVariants = (group: KitGroup): string[] => [
  ...new Set(group.finds.map((find) => find.variant ?? "default")),
];

const toVariantClasses = (recipe: PackRecipe, variant: string): string =>
  recipe.component.groups
    .find((entry) => entry.prop === "variant")
    ?.options.find((option) => option.value === variant)?.classes ?? "";

const toBadgeLine = (group: KitGroup, first: MarkupDrift): string => {
  const variants = listBadgeVariants(group);

  const places = [
    ...new Set(
      group.finds.map(
        (find) => `${find.file}:${find.line} ${find.variant ?? "default"}`
      )
    ),
  ]
    .slice(0, LISTED_LINES)
    .join(", ");

  const classes = variants
    .map(
      (variant) => `${variant} \`${toVariantClasses(first.recipe, variant)}\``
    )
    .join("; ");

  let name = "per place";

  if (variants.length === 1) {
    name = variants[0] ?? "default";
  }

  return `- ${toCount(group, "badge")} hand-styled (${places}). Replace the hand-styled badge with the app Badge (variant ${name}); keep the text. Give each one ${toRecipeText(first.recipe)} and the classes of its variant: ${classes}. Move to app then maps it to Badge.`;
};

const toScriptClause = (group: KitGroup): string => {
  const first = group.finds.find((find) => find.isScriptBuilt);

  if (!first) {
    return "";
  }

  let search = "";

  if (first.scriptText !== null) {
    search = ` (search for '${first.scriptText}')`;
  }

  return ` This markup is built by a script: change the template in the <script> of ${first.file}${search}.`;
};

const toPartLine = (group: KitGroup): string => {
  const [first] = group.finds;

  if (!first) {
    return "";
  }

  if (first.tag === "card") {
    return toCardLine(group, first);
  }

  if (first.tag === "badge") {
    return toBadgeLine(group, first);
  }

  const { component, slot } = first.recipe;
  const count = group.finds.length;
  let word = PLURAL_WORDS[first.tag];
  let verb = "are";
  let variant = "";
  let slotText = "";

  if (count === 1) {
    verb = "is";
    word = TAG_WORDS[first.tag];
  }

  if (first.suggestedVariant !== null) {
    variant = ` (variant ${first.suggestedVariant})`;
  }

  if (slot !== null) {
    slotText = ` and data-slot="${slot}"`;
  }

  return `- ${count} ${word} ${verb} hand-styled (${toPlaces(group.finds)}). Use the ${component.name} recipe: \`${component.base.join(" ")}\`${variant}. Add these classes${slotText} to each one and keep the page CSS for the look, so Move to app maps it to ${component.name}.`;
};

const toKitLine = (group: KitGroup): string =>
  `${toPartLine(group)}${toScriptClause(group)}`;

const setKitCount = (ctx: KitContext, count: number): void => {
  KIT_COUNTS.set(ctx, [...(KIT_COUNTS.get(ctx) ?? []), count]);
};

const listKitLines = async (
  ctx: KitContext,
  preview: PreviewService
): Promise<string[]> => {
  if (!isKitRun(ctx)) {
    return [];
  }

  let drift: PrototypeDrift = { finds: [], isRenderSkipped: false };

  try {
    drift = await listPrototypeDrift(
      ctx.project,
      ctx.direction.workTree,
      null,
      {
        direction: ctx.direction,
        preview,
      }
    );
  } catch {
    drift = { finds: [], isRenderSkipped: false };
  }

  setKitCount(ctx, drift.finds.length);

  const lines = toGroups(drift.finds).map((group) => toKitLine(group));

  if (drift.isRenderSkipped && lines.length > 0) {
    return [...lines, RENDER_SKIPPED_LINE];
  }

  return lines;
};

const toKitGaps = (ctx: KitContext, hasEdit: boolean): AppReviewGaps | null => {
  if (!hasEdit || !isKitRun(ctx)) {
    return null;
  }

  return { isPrototype: true, mobile: false, review: false };
};

const toRanList = (gaps: AppReviewGaps): string => {
  const ran: string[] = [];

  if (gaps.mobile) {
    ran.push(MOBILE_RAN);
  }

  if (gaps.review) {
    ran.push(REVIEW_RAN);
  }

  return ran.join(" and ");
};

const toReviewOpening = (gaps: AppReviewGaps, pass: number): string | null => {
  if (isKitOnly(gaps)) {
    if (pass > 1) {
      return null;
    }

    return "You finished a prototype of an app, so the studio checked its parts against the app kit recipes.";
  }

  const ran = toRanList(gaps);

  if (pass > 1) {
    return `You edited again after the studio checks, so the studio ran ${ran} once more.`;
  }

  let kind = "an app";

  if (gaps.isPrototype) {
    kind = "a prototype";
  }

  return `You finished ${kind} run without ${ran}, so the studio ran them.`;
};

const isStudioRan = (record: AppReviewRecord): boolean =>
  record.mobileShot !== "agent" || record.review !== "agent";

const toKitTally = (ctx: KitContext): KitTally | null => {
  const counts = KIT_COUNTS.get(ctx) ?? [];
  const first = counts[0] ?? 0;

  KIT_COUNTS.delete(ctx);

  if (first === 0) {
    return null;
  }

  return { first, last: counts.at(-1) ?? 0, passes: counts.length };
};

const toKitClause = (
  tally: KitTally,
  records: readonly AppReviewRecord[]
): string => {
  const head = `${tally.first} parts did not use the app kit`;

  if (!records.some((record) => record.fixLoop)) {
    return `${head}; no fix loop ran`;
  }

  if (tally.passes < 2) {
    return `${head}; a fix loop ran`;
  }

  return `${head}; a fix loop ran; after it ${tally.last}`;
};

const toKitAfterClause = (tally: KitTally): string => {
  const head = `${tally.first} parts did not use the app kit`;

  if (tally.passes < 2) {
    return head;
  }

  return `${head}, ${tally.last} after the fix loop`;
};

export {
  isStudioRan,
  listKitLines,
  toKitAfterClause,
  toKitClause,
  toKitGaps,
  toKitTally,
  toReviewOpening,
};

export type { KitTally };
