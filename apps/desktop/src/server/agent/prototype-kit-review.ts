import type { AppReviewRecord } from "@design-studio/contracts";

import type { AgentRunContext } from "../../shared/server-ports.js";
import type {
  DriftTag,
  MarkupDrift,
  PackRecipe,
} from "../components/kit-drift/engine/index.js";
import {
  isKitPrototype,
  listPrototypeDrift,
} from "../components/kit-drift/kit-drift-prototype.js";
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

const MOBILE_RAN =
  "a mobile screenshot at 390 px wide, 2400 px tall so content in inner scroll areas shows (attached)";

const REVIEW_RAN =
  "review_frame on the context frame at its size and at 390 px";

const TAG_WORDS: Readonly<Record<DriftTag, string>> = {
  "a-as-button": "link styled as a button",
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
    const key = `${find.tag}|${find.recipe.component.name}`;

    groups.set(key, [...(groups.get(key) ?? []), find]);
  }

  return [...groups.entries()].map(([key, list]) => ({ finds: list, key }));
};

const toPlaces = (finds: readonly MarkupDrift[]): string =>
  finds
    .slice(0, LISTED_LINES)
    .map((find) => `${find.file}:${find.line}`)
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

const toKitLine = (group: KitGroup): string => {
  const [first] = group.finds;

  if (!first) {
    return "";
  }

  if (first.tag === "card") {
    return toCardLine(group, first);
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

const setKitCount = (ctx: KitContext, count: number): void => {
  KIT_COUNTS.set(ctx, [...(KIT_COUNTS.get(ctx) ?? []), count]);
};

const listKitLines = async (ctx: KitContext): Promise<string[]> => {
  if (!isKitRun(ctx)) {
    return [];
  }

  let finds: MarkupDrift[] = [];

  try {
    finds = await listPrototypeDrift(ctx.project, ctx.direction.workTree, null);
  } catch {
    finds = [];
  }

  setKitCount(ctx, finds.length);

  return toGroups(finds).map((group) => toKitLine(group));
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

    return "You finished a prototype of an app, so the studio checked its controls against the app kit recipes.";
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
  const head = `${tally.first} controls did not use the app kit`;

  if (!records.some((record) => record.fixLoop)) {
    return `${head}; no fix loop ran`;
  }

  if (tally.passes < 2) {
    return `${head}; a fix loop ran`;
  }

  return `${head}; a fix loop ran; after it ${tally.last}`;
};

const toKitAfterClause = (tally: KitTally): string => {
  const head = `${tally.first} controls did not use the app kit`;

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
