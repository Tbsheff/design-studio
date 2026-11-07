import { EFFECT_CLASS_PREFIX } from "@design-studio/contracts/layer-effect";

import type { EffectInfo, EffectItem, EffectStyle } from "./deps.js";
import { toEffectDeclarations } from "./engine/index.js";
import { toCurrent } from "./set-plan.js";
import type { EffectScope } from "./set-plan.js";
import { getSheet, toSheetRules } from "./sheet.js";
import type { SheetRule } from "./sheet.js";
import { getEffectSite } from "./site.js";

interface EffectSource {
  readonly col: number;
  readonly file: string;
  readonly line: number;
}

const toStyleName = (rule: SheetRule): string =>
  rule.name ?? rule.className.slice(EFFECT_CLASS_PREFIX.length);

const toCss = (effects: readonly EffectItem[]): string =>
  toEffectDeclarations(effects)
    .map((entry) => `${entry.property}: ${entry.value}`)
    .join("; ");

const toStyle = (rule: SheetRule, sheetFile: string): EffectStyle => ({
  className: rule.className,
  css: toCss(rule.effects),
  effects: rule.effects,
  file: sheetFile,
  name: toStyleName(rule),
});

const inspectEffects = async (
  scope: EffectScope,
  source: EffectSource
): Promise<EffectInfo> => {
  const [site, sheet] = await Promise.all([
    getEffectSite(scope.workTree, source),
    getSheet(scope.workTree),
  ]);

  if (sheet === null) {
    return {
      className: null,
      effects: [],
      file: site.relative,
      reason: null,
      sheet: null,
      style: null,
      styleName: null,
    };
  }

  const current = toCurrent(site.tokens, toSheetRules(sheet.text));
  let named: EffectStyle | null = null;

  if (current.named !== null) {
    named = toStyle(current.named, sheet.relative);
  }

  return {
    className: current.anon?.className ?? null,
    effects: current.anon?.effects ?? [],
    file: site.relative,
    reason: null,
    sheet: sheet.relative,
    style: named,
    styleName: named?.name ?? null,
  };
};

export { inspectEffects, toStyle };
