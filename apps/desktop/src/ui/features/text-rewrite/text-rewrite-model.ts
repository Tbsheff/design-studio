import { copy } from "./copy.js";
import type { RouteInput, SelectionContext, directEditRoutes } from "./deps.js";

type RewriteMode =
  | "clarify"
  | "fix"
  | "lengthen"
  | "shorten"
  | "translate"
  | "voice";

type View = "closed" | "languages" | "menu" | "options";

interface ModeItem {
  readonly label: string;
  readonly mode: RewriteMode;
}

interface LanguageItem {
  readonly code: string;
  readonly label: string;
}

const MODE_ITEMS: readonly ModeItem[] = [
  { label: copy.shorten, mode: "shorten" },
  { label: copy.lengthen, mode: "lengthen" },
  { label: copy.clarify, mode: "clarify" },
  { label: copy.voice, mode: "voice" },
  { label: copy.fix, mode: "fix" },
];

const LANGUAGE_ITEMS: readonly LanguageItem[] = [
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "ja", label: "日本語" },
];

const toHasText = (target: SelectionContext): boolean =>
  target.source !== null && target.text.trim() !== "";

const toTargetFields = (
  target: SelectionContext
): { readonly component: string } | { readonly tag: string } => {
  if (target.component) {
    return { component: target.component };
  }

  return { tag: target.tag.toLowerCase() };
};

const toEditBody = (
  ids: { readonly directionId: string; readonly projectId: string },
  target: SelectionContext,
  text: string,
  layerText: string
): RouteInput<typeof directEditRoutes.applyDirectEdit> => ({
  ...ids,
  hints: { text: layerText },
  selector: target.selector,
  source: target.source,
  text,
  ...toTargetFields(target),
});

export { LANGUAGE_ITEMS, MODE_ITEMS, toEditBody, toHasText };

export type { LanguageItem, ModeItem, RewriteMode, View };
