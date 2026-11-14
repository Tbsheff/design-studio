import { parseClass, resolveSource } from "./deps.js";
import type { EffectInfo } from "./deps.js";
import { fromVariantDeclarations, fromVariantToken } from "./engine/index.js";
import type { EffectDeclaration } from "./engine/index.js";
import type { EffectScope, EffectTarget } from "./set-plan.js";
import { toVariantSite } from "./variant-plan.js";
import type { VariantSite } from "./variant-plan.js";

const DECLARATION_GAP = ": ";

const toClassDeclarations = (
  classes: readonly string[],
  variant: string
): EffectDeclaration[] =>
  classes.flatMap((token) => {
    const parsed = parseClass(token);

    if (parsed.variants !== variant) {
      return [];
    }

    return fromVariantToken(token.slice(parsed.variants.length)) ?? [];
  });

const toCssDeclarations = (set: readonly string[]): EffectDeclaration[] =>
  set.flatMap((entry) => {
    const gap = entry.indexOf(DECLARATION_GAP);

    if (gap === -1) {
      return [];
    }

    return [
      {
        property: entry.slice(0, gap).trim(),
        value: entry.slice(gap + DECLARATION_GAP.length).trim(),
      },
    ];
  });

const toSiteDeclarations = (
  site: VariantSite,
  variant: string
): EffectDeclaration[] => {
  if (site.classes !== null) {
    return toClassDeclarations(site.classes, variant);
  }

  if (site.mode === "css") {
    return toCssDeclarations(site.set);
  }

  return [];
};

const inspectVariantEffects = async (
  scope: EffectScope,
  loc: EffectTarget["source"],
  variant: string
): Promise<EffectInfo> => {
  const target = { selector: null, source: loc, tag: null };

  const [site, resolved] = await Promise.all([
    toVariantSite(scope, target, variant),
    resolveSource(scope.workTree, loc.file),
  ]);

  return {
    className: null,
    effects: fromVariantDeclarations(toSiteDeclarations(site, variant)),
    file: resolved.relative,
    reason: site.reason,
    sheet: null,
    style: null,
    styleName: null,
  };
};

export { inspectVariantEffects };
