import { readFile } from "node:fs/promises";

import { resolveSource } from "./deps.js";
import type { EffectInfo, EffectItem } from "./deps.js";
import { fromVariantDeclarations } from "./engine/index.js";
import type { EffectDeclaration, ShadowScale } from "./engine/index.js";
import type { EffectScope, EffectTarget } from "./set-plan.js";
import { toClassEffects, toSizeFields } from "./shadow-read.js";
import { getShadowScale } from "./shadow-site.js";
import { toVariantSite } from "./variant-plan.js";
import type { VariantSite } from "./variant-plan.js";

const DECLARATION_GAP = ": ";

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

const toSiteEffects = (
  site: VariantSite,
  variant: string,
  scale: ShadowScale
): EffectItem[] => {
  if (site.classes !== null) {
    return toClassEffects(site.classes, variant, scale, false);
  }

  if (site.mode === "css") {
    return fromVariantDeclarations(toCssDeclarations(site.set), scale);
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

  const scale = await getShadowScale(scope, {
    relative: resolved.relative,
    text: await readFile(resolved.file, "utf-8"),
  });

  return {
    className: null,
    effects: toSiteEffects(site, variant, scale),
    file: resolved.relative,
    reason: site.reason,
    sheet: null,
    style: null,
    styleName: null,
    ...toSizeFields(scale),
  };
};

export { inspectVariantEffects };
