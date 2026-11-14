import { readFile } from "node:fs/promises";

import {
  elementClassInfo,
  normalizeVariant,
  parseClass,
  parseDirectEditRequest,
  planDirectEdit,
  resolveSource,
} from "./deps.js";
import type { EffectItem } from "./deps.js";
import type { ShadowScale, VariantStyle } from "./engine/index.js";
import {
  isEffectBase,
  toScaledEffects,
  toVariantStyle,
  toVariantTokens,
} from "./engine/index.js";
import { EffectError } from "./errors.js";
import { toKindsTitle } from "./set-plan.js";
import type {
  EffectScope,
  EffectSetPlan,
  EffectSetRequest,
  EffectTarget,
} from "./set-plan.js";
import { getShadowScale } from "./shadow-site.js";

interface VariantSite {
  readonly classes: readonly string[] | null;
  readonly mode: string;
  readonly reason: string | null;
  readonly set: readonly string[];
}

interface VariantEdit {
  readonly classes: {
    readonly add: string[];
    readonly remove: string[];
  } | null;
  readonly style: Partial<VariantStyle> | null;
}

const VARIANT_KINDS: ReadonlySet<EffectItem["kind"]> = new Set([
  "background-blur",
  "drop-shadow",
  "inner-shadow",
  "layer-blur",
]);

const NOTHING = "The layer already has these effects for this state.";

const NO_STYLE_NAME =
  "A saved effect style applies to the base style only. Pick Default in the state bar, or send effects.";

const NO_KIND =
  "A state or breakpoint takes drop and inner shadows, layer blur and background blur only. Pick Default in the state bar for noise, glass and shaders.";

const NO_BACKDROP =
  "This page does not use Tailwind, so a background blur cannot be written for one state. Use a shadow or a layer blur.";

const toVariantOf = (raw: string): string => {
  const variant = normalizeVariant(raw);

  if (variant === null) {
    throw new EffectError(
      `The variant ${raw} is not a known state or breakpoint. Use a prefix such as hover:, md: or data-[state=open]:.`
    );
  }

  return variant;
};

const toCheckedEffects = (request: EffectSetRequest): readonly EffectItem[] => {
  if (request.hasStyleName) {
    throw new EffectError(NO_STYLE_NAME);
  }

  const effects = request.effects ?? [];

  if (effects.some((item) => !VARIANT_KINDS.has(item.kind))) {
    throw new EffectError(NO_KIND);
  }

  return effects;
};

const toClassEdit = (
  classes: readonly string[],
  effects: readonly EffectItem[],
  variant: string,
  scale: ShadowScale
): VariantEdit => {
  const wanted = toVariantTokens(effects, variant, scale);
  const wantedSet = new Set(wanted);
  const present = new Set(classes);

  const remove = classes.filter((token) => {
    const parsed = parseClass(token);

    return (
      parsed.variants === variant &&
      isEffectBase(token.slice(parsed.variants.length), scale) &&
      !wantedSet.has(token)
    );
  });

  const add = wanted.filter((token) => !present.has(token));

  if (add.length === 0 && remove.length === 0) {
    throw new EffectError(NOTHING);
  }

  return { classes: { add, remove }, style: null };
};

const DECLARATION_GAP = ":";

const toSetProperties = (set: readonly string[]): ReadonlySet<string> =>
  new Set(set.map((entry) => entry.split(DECLARATION_GAP, 1)[0]?.trim() ?? ""));

const toStyleEdit = (
  effects: readonly EffectItem[],
  set: readonly string[]
): VariantEdit => {
  if (effects.some((item) => item.kind === "background-blur")) {
    throw new EffectError(NO_BACKDROP);
  }

  const style = toVariantStyle(effects, toSetProperties(set));

  if (Object.keys(style).length === 0) {
    throw new EffectError(NOTHING);
  }

  return { classes: null, style };
};

const toVariantSite = async (
  scope: EffectScope,
  target: EffectTarget,
  variant: string
): Promise<VariantSite> => {
  const info = await elementClassInfo(
    scope.workTree,
    scope.project.kind,
    target.source,
    variant
  );

  let classes: readonly string[] | null = null;
  const { tailwind } = info;

  if (info.variants.mode === "classes" && tailwind?.mode === "classes") {
    ({ classes } = tailwind);
  }

  return {
    classes,
    mode: info.variants.mode,
    reason: info.variants.reason,
    set: info.variants.set,
  };
};

const toVariantEdit = (
  site: VariantSite,
  effects: readonly EffectItem[],
  variant: string,
  scale: ShadowScale
): VariantEdit => {
  if (site.classes !== null) {
    return toClassEdit(site.classes, effects, variant, scale);
  }

  if (site.mode === "css") {
    return toStyleEdit(toScaledEffects(effects, scale), site.set);
  }

  throw new EffectError(
    site.reason ?? "This layer cannot take a state or breakpoint."
  );
};

const toEditRequest = (
  target: EffectTarget,
  edit: VariantEdit,
  variant: string
): ReturnType<typeof parseDirectEditRequest> => {
  const base = {
    selector: target.selector ?? "",
    source: target.source,
    variant,
  };

  let withTag: typeof base & { readonly tag?: string } = base;

  if (target.tag !== null) {
    withTag = { ...base, tag: target.tag };
  }

  if (edit.classes !== null) {
    return parseDirectEditRequest({ ...withTag, classes: edit.classes });
  }

  return parseDirectEditRequest({ ...withTag, style: edit.style ?? {} });
};

const toVariantTitle = (
  effects: readonly EffectItem[],
  variant: string
): string =>
  toKindsTitle(effects, null).replace(
    "Effects:",
    `Effects (${variant.slice(0, -1)}):`
  );

const toVariantEffectPlan = async (
  scope: EffectScope,
  request: EffectSetRequest,
  variant: string
): Promise<EffectSetPlan> => {
  const effects = toCheckedEffects(request);

  const [site, resolved] = await Promise.all([
    toVariantSite(scope, request.target, variant),
    resolveSource(scope.workTree, request.target.source.file),
  ]);

  const scale = await getShadowScale(scope, {
    relative: resolved.relative,
    text: await readFile(resolved.file, "utf-8"),
  });

  const edit = toVariantEdit(site, effects, variant, scale);

  const planned = await planDirectEdit(
    scope.workTree,
    toEditRequest(request.target, edit, variant),
    null,
    { projectKind: scope.project.kind }
  );

  if (planned.patch.code === planned.original) {
    throw new EffectError(NOTHING);
  }

  return {
    className: null,
    hasRuntime: false,
    styleName: null,
    title: toVariantTitle(effects, variant),
    written: [
      {
        code: planned.patch.code,
        original: planned.original,
        target: planned.target,
      },
    ],
  };
};

export { toVariantEffectPlan, toVariantOf, toVariantSite };

export type { VariantSite };
