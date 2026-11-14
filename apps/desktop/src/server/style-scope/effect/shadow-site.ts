import { elementClassInfo, loadAppTokens, tailwindThemeFor } from "./deps.js";
import { toShadowScale } from "./engine/index.js";
import type { ShadowScale } from "./engine/index.js";
import type { EffectScope, EffectTarget } from "./set-plan.js";
import { getSheet } from "./sheet.js";

interface ShadowFile {
  readonly relative: string;
  readonly text: string;
}

interface ShadowSite {
  readonly classes: readonly string[] | null;
  readonly scale: ShadowScale;
}

const INSET_VERSION = 4;

const getShadowScale = async (
  scope: EffectScope,
  file: ShadowFile
): Promise<ShadowScale> => {
  const [theme, tokens, sheet] = await Promise.all([
    tailwindThemeFor(scope.workTree, file, { projectKind: scope.project.kind }),
    loadAppTokens(scope.workTree),
    getSheet(scope.workTree),
  ]);

  return toShadowScale({
    hasInsetScale: theme?.version === INSET_VERSION,
    themeShadow: theme?.shadow ?? null,
    tokenText: [tokens?.text ?? "", sheet?.text ?? "", file.text].join("\n"),
  });
};

const getShadowSite = async (
  scope: EffectScope,
  source: EffectTarget["source"],
  file: ShadowFile
): Promise<ShadowSite> => {
  const [info, scale] = await Promise.all([
    elementClassInfo(scope.workTree, scope.project.kind, source, ""),
    getShadowScale(scope, file),
  ]);

  let classes: readonly string[] | null = null;
  const { tailwind } = info;

  if (info.variants.mode === "classes" && tailwind?.mode === "classes") {
    ({ classes } = tailwind);
  }

  return { classes, scale };
};

export { getShadowScale, getShadowSite };

export type { ShadowFile, ShadowSite };
