import { classify, parseClass } from "../deps.js";
import type { TailwindTheme } from "../deps.js";
import {
  CSS_PROPERTIES,
  GROUP_ORDER,
  READ_NAMES,
  SIDED_GROUPS,
  SINGLE_GROUPS,
} from "./groups.js";
import type {
  ClassPlan,
  GroupClasses,
  LayerStyleGroup,
  ReadProperty,
  StyleDeclaration,
} from "./groups.js";

interface VariantPlanScope {
  readonly theme: TailwindTheme | null;
  readonly variant: string;
}

const toGroupOf = (
  token: string,
  theme: TailwindTheme | null
): LayerStyleGroup | null => {
  const found = classify(parseClass(token), theme);

  if (found === null) {
    return null;
  }

  if (found.kind === "sided") {
    return SIDED_GROUPS.get(found.group) ?? null;
  }

  return SINGLE_GROUPS.get(found.group) ?? null;
};

const toOrderedGroups = (
  groups: readonly LayerStyleGroup[]
): LayerStyleGroup[] => {
  const wanted = new Set(groups);

  return GROUP_ORDER.filter((group) => wanted.has(group));
};

const toStyleGroups = (
  classes: readonly string[],
  groups: readonly LayerStyleGroup[],
  theme: TailwindTheme | null
): GroupClasses[] =>
  toOrderedGroups(groups).map((group) => ({
    classes: classes.filter((token) => toGroupOf(token, theme) === group),
    group,
  }));

const toPickedClasses = (
  classes: readonly string[],
  groups: readonly LayerStyleGroup[],
  theme: TailwindTheme | null
): string[] => {
  const wanted = new Set(groups);

  return classes.filter((token) => {
    const group = toGroupOf(token, theme);

    return group !== null && wanted.has(group);
  });
};

const toVariantClassPlan = (
  source: readonly string[],
  target: readonly string[],
  groups: readonly LayerStyleGroup[],
  scope: VariantPlanScope
): ClassPlan => {
  const { theme, variant } = scope;

  const wanted = toPickedClasses(source, groups, theme).flatMap((token) => {
    if (parseClass(token).variants !== "") {
      return [];
    }

    return [`${variant}${token}`];
  });

  const wantedSet = new Set(wanted);
  const targetSet = new Set(target);

  const remove = toPickedClasses(target, groups, theme).filter(
    (token) => parseClass(token).variants === variant && !wantedSet.has(token)
  );

  const add = [...wantedSet].filter((token) => !targetSet.has(token));

  return { add, remove };
};

const toClassPlan = (
  source: readonly string[],
  target: readonly string[],
  groups: readonly LayerStyleGroup[],
  theme: TailwindTheme | null
): ClassPlan => {
  const wanted = toPickedClasses(source, groups, theme);
  const wantedSet = new Set(wanted);
  const targetSet = new Set(target);

  const prefixes = new Set([
    "",
    ...wanted.map((token) => parseClass(token).variants),
  ]);

  const remove = toPickedClasses(target, groups, theme).filter(
    (token) => prefixes.has(parseClass(token).variants) && !wantedSet.has(token)
  );

  const add = [...wantedSet].filter((token) => !targetSet.has(token));

  return { add, remove };
};

const toReadProperties = (groups: readonly LayerStyleGroup[]): ReadProperty[] =>
  toOrderedGroups(groups).flatMap((group) =>
    CSS_PROPERTIES[group].map((property) => ({
      property,
      read: READ_NAMES.get(property) ?? property,
    }))
  );

const toDeclarationPlan = (
  source: readonly StyleDeclaration[],
  target: readonly StyleDeclaration[]
): StyleDeclaration[] => {
  const current = new Map(target.map((entry) => [entry.property, entry.value]));

  return source.filter((entry) => current.get(entry.property) !== entry.value);
};

const toGroupDeclarations = (
  declarations: readonly StyleDeclaration[],
  group: LayerStyleGroup
): StyleDeclaration[] => {
  const names = new Set(CSS_PROPERTIES[group]);

  return declarations.filter((entry) => names.has(entry.property));
};

export {
  toClassPlan,
  toDeclarationPlan,
  toGroupDeclarations,
  toGroupOf,
  toOrderedGroups,
  toReadProperties,
  toStyleGroups,
  toVariantClassPlan,
};
