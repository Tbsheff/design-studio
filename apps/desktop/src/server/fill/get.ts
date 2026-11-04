import { isBackgroundClass } from "./classes.js";
import { paintFromCss, parseGradient } from "./css.js";
import { BLEND_MODES, classify, classProps, parseClass } from "./deps.js";
import type {
  BlendMode,
  Classified,
  BlendProperty,
  FillBlend,
  FillInfo,
  FillSpec,
  SourceLoc,
  TailwindTheme,
} from "./deps.js";
import { blendOf, gradientOf, paintOfValue } from "./parse-classes.js";
import { loadFillSite } from "./site.js";
import type { FillScope, FillSite } from "./site.js";

const CSS_PROPS = {
  blend: ["background-blend-mode", "backgroundBlendMode"],
  color: ["background-color", "backgroundColor"],
  image: ["background-image", "backgroundImage"],
  mix: ["mix-blend-mode", "mixBlendMode"],
  short: ["background", "background"],
} as const;

interface CssFill {
  css: string | null;
  fill: FillSpec | null;
}

const NO_CSS_FILL: CssFill = { css: null, fill: null };

const MODES = new Set<string>(BLEND_MODES);

const escapeRegExp = (text: string): string =>
  text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

const declPattern = (name: string): RegExp =>
  new RegExp(
    String.raw`(?:^|[\s;{,"'])` +
      escapeRegExp(name) +
      String.raw`\s*:\s*["'\x60]?(?<value>[^;"'\x60}]+)`,
    "u"
  );

const declValue = (tag: string, names: readonly string[]): string | null => {
  for (const name of names) {
    const value = declPattern(name).exec(tag)?.groups?.["value"]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
};

const gradientFill = (image: string | null): CssFill | null => {
  if (!image) {
    return null;
  }

  const fill = parseGradient(image);

  if (!fill) {
    return null;
  }

  return { css: image, fill };
};

const cssFill = (tag: string): CssFill => {
  const image =
    declValue(tag, CSS_PROPS.image) ?? declValue(tag, CSS_PROPS.short);

  const gradient = gradientFill(image);

  if (gradient) {
    return gradient;
  }

  const color = declValue(tag, CSS_PROPS.color);

  if (color) {
    return { css: color, fill: { paint: paintFromCss(color), type: "solid" } };
  }

  return NO_CSS_FILL;
};

const BLEND_NAMES: readonly [BlendProperty, readonly string[]][] = [
  ["mix-blend-mode", CSS_PROPS.mix],
  ["background-blend-mode", CSS_PROPS.blend],
];

const cssBlend = (tag: string): FillBlend[] =>
  BLEND_NAMES.flatMap(([property, names]) => {
    const mode = declValue(tag, names);

    if (!mode || !MODES.has(mode)) {
      return [];
    }

    return [{ mode: mode as BlendMode, property }];
  });

const classOf = (token: string, theme: TailwindTheme): Classified | null => {
  const parsed = parseClass(token);

  if (parsed.variants !== "") {
    return null;
  }

  return classify(parsed, theme);
};

const isSolidClass = (token: string, theme: TailwindTheme): boolean => {
  const cls = classOf(token, theme);

  return Boolean(cls && classProps(cls).includes("background-color"));
};

const classFill = (site: FillSite, theme: TailwindTheme): FillSpec | null => {
  const gradient = gradientOf(site.classes);

  if (gradient) {
    return gradient;
  }

  const solid = site.classes.find((token) => isSolidClass(token, theme));

  if (!solid) {
    return null;
  }

  return { paint: paintOfValue(solid.slice("bg-".length)), type: "solid" };
};

const classInfo = (site: FillSite, theme: TailwindTheme): FillInfo => ({
  blend: blendOf(site.classes),
  classes: site.classes.filter((token) => isBackgroundClass(token, theme)),
  css: null,
  file: site.relative,
  fill: classFill(site, theme),
  mode: "classes",
});

const getFill = async (scope: FillScope, loc: SourceLoc): Promise<FillInfo> => {
  const site = await loadFillSite(scope, loc);

  if (site.mode === "classes" && site.theme) {
    return classInfo(site, site.theme);
  }

  const found = cssFill(site.tag);

  return {
    blend: cssBlend(site.tag),
    classes: [],
    css: found.css,
    file: site.relative,
    fill: found.fill,
    mode: "css",
  };
};

export { getFill };
