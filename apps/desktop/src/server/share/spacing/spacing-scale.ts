import type { SpacingScope } from "./commit.js";
import { lengthToPx } from "./deps.js";
import type { SpacingInfo, SourceLoc } from "./deps.js";
import { inspectSpacing } from "./get.js";
import type { SpacingElement } from "./get.js";
import { loadSpacingSite } from "./site.js";
import type { SpacingSite } from "./site.js";

interface SpacingStep {
  readonly px: number;
  readonly token: string;
}

interface SpacingBox extends SpacingInfo {
  readonly scale: readonly SpacingStep[];
}

interface SpacingComputed {
  readonly gap: string;
  readonly margin: string;
  readonly padding: string;
}

const STEP_FINE = 24;
const STEP_COARSE_EVERY = 4;
const STEP_MAX = 96;
const EMPTY_RECT = { height: 0, width: 0, x: 0, y: 0 };

const toScaleSteps = (): number[] => {
  const fine = Array.from({ length: STEP_FINE + 1 }, (_slot, step) => step);

  const coarse = Array.from(
    { length: (STEP_MAX - STEP_FINE) / STEP_COARSE_EVERY },
    (_slot, index) => STEP_FINE + (index + 1) * STEP_COARSE_EVERY
  );

  return [...fine, ...coarse];
};

const toThemeScale = (site: SpacingSite): SpacingStep[] => {
  const { theme } = site;

  if (!theme || site.mode !== "classes") {
    return [];
  }

  const steps = toScaleSteps().map((step) => ({
    px: step * theme.spacingPx,
    token: String(step),
  }));

  const named = [...theme.spacing].map(([token, px]) => ({ px, token }));

  return [...steps, ...named];
};

const toEntryScale = (site: SpacingSite): SpacingStep[] =>
  site.entries.flatMap((entry) => {
    const px = lengthToPx(entry.value);

    if (entry.type !== "dimension" || px === null || px < 0) {
      return [];
    }

    return [{ px, token: entry.path }];
  });

const toScale = (site: SpacingSite): SpacingStep[] => {
  const steps = toThemeScale(site);

  if (steps.length > 0) {
    return steps;
  }

  return toEntryScale(site);
};

const toElement = (computed: SpacingComputed): SpacingElement => ({
  rect: EMPTY_RECT,
  styles: { ...computed },
});

const getSpacingBox = async (
  scope: SpacingScope,
  source: SourceLoc,
  computed: SpacingComputed
): Promise<SpacingBox> => {
  const [info, site] = await Promise.all([
    inspectSpacing(scope, source, toElement(computed)),
    loadSpacingSite(scope, source),
  ]);

  return { ...info, scale: toScale(site) };
};

export { getSpacingBox };

export type { SpacingBox, SpacingComputed, SpacingStep };
