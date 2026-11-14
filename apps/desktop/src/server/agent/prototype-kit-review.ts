import type { AppReviewRecord } from "@design-studio/contracts";

import type { AgentRunContext } from "../../shared/server-ports.js";
import type {
  DriftTag,
  MarkupDrift,
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

type KitContext = Pick<AgentRunContext, "direction" | "project" | "request">;

const KIT_COUNTS = new WeakMap<KitContext, number[]>();

const LISTED_LINES = 6;

const MOBILE_RAN =
  "a mobile screenshot at 390 px wide, 2400 px tall so content in inner scroll areas shows (attached)";

const REVIEW_RAN =
  "review_frame on the context frame at its size and at 390 px";

const TAG_WORDS: Readonly<Record<DriftTag, string>> = {
  "a-as-button": "links styled as buttons",
  button: "buttons",
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

const toKitLine = (group: KitGroup): string => {
  const [first] = group.finds;

  if (!first) {
    return "";
  }

  const { component, slot } = first.recipe;
  const count = group.finds.length;
  const word = TAG_WORDS[first.tag];
  let verb = "are";
  let variant = "";
  let slotText = "";

  if (count === 1) {
    verb = "is";
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
    finds = await listPrototypeDrift(ctx.direction.workTree, null);
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

const toKitNote = (
  ctx: KitContext,
  records: readonly AppReviewRecord[]
): string => {
  const counts = KIT_COUNTS.get(ctx) ?? [];
  const first = counts[0] ?? 0;
  const last = counts.at(-1) ?? 0;

  KIT_COUNTS.delete(ctx);

  if (first === 0) {
    return "";
  }

  if (!records.some((record) => record.fixLoop)) {
    return `Studio check: ${first} controls did not use the app kit; no fix loop ran.`;
  }

  if (counts.length < 2) {
    return `Studio check: ${first} controls did not use the app kit; a fix loop ran.`;
  }

  return `Studio check: ${first} controls did not use the app kit; a fix loop ran; after it ${last}.`;
};

export { isStudioRan, listKitLines, toKitGaps, toKitNote, toReviewOpening };
