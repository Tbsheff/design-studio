import { hexOf, nearColor } from "../../../shared/color-near.js";

type NearFamily =
  | "background-color"
  | "border-color"
  | "border-radius"
  | "color";

interface NearValueUse {
  readonly family: NearFamily;
  readonly id: number;
  readonly tag: string;
  readonly uses: number;
  readonly value: string;
}

interface NearValueHit {
  readonly id: number;
  readonly message: string;
  readonly target: string;
  readonly value: string;
}

interface NearValueInput {
  readonly radiusWindow: number;
  readonly uses: readonly NearValueUse[];
}

interface NearGroup {
  readonly family: NearFamily;
  readonly ids: number[];
  readonly key: string;
  readonly px: number | null;
  readonly tag: string;
  readonly value: string;
  uses: number;
}

const COLOR_DELTA = 0.02;
const HIT_CAP = 10;
const RADIUS_RARE_MAX = 2;
const RADIUS_COMMON_MIN = 3;
const RADIUS_MIN_STEP = 1;
const REM_PX = 16;
const UNIT_PX: Readonly<Record<"px" | "rem", number>> = { px: 1, rem: REM_PX };

const toPx = (value: string): number | null => {
  const text = value.trim();

  const unit =
    (["rem", "px"] as const).find((name) => text.endsWith(name)) ?? null;

  if (unit === null || text.length === unit.length) {
    return null;
  }

  const amount = Number(text.slice(0, text.length - unit.length));

  if (!Number.isFinite(amount)) {
    return null;
  }

  return amount * UNIT_PX[unit];
};

const isColorFamily = (family: NearFamily): boolean =>
  family !== "border-radius";

const toKey = (use: NearValueUse): string | null => {
  if (isColorFamily(use.family)) {
    const hex = hexOf(use.value);

    if (hex === null) {
      return null;
    }

    return `${use.family}|${hex}`;
  }

  const px = toPx(use.value);

  if (px === null) {
    return null;
  }

  return `${use.family}|${use.tag}|${px}`;
};

const insertUse = (
  groups: Map<string, NearGroup>,
  use: NearValueUse,
  groupKey: string
): void => {
  const seen = groups.get(groupKey) ?? null;

  if (seen === null) {
    groups.set(groupKey, {
      family: use.family,
      ids: [use.id],
      key: groupKey,
      px: toPx(use.value),
      tag: use.tag,
      uses: use.uses,
      value: use.value,
    });

    return;
  }

  seen.ids.push(use.id);
  seen.uses += use.uses;
};

const toGroups = (uses: readonly NearValueUse[]): NearGroup[] => {
  const groups = new Map<string, NearGroup>();

  for (const use of uses) {
    const groupKey = toKey(use);

    if (groupKey !== null) {
      insertUse(groups, use, groupKey);
    }
  }

  return [...groups.values()];
};

const toOnly = (groups: readonly NearGroup[]): NearGroup | null => {
  if (groups.length !== 1) {
    return null;
  }

  return groups[0] ?? null;
};

const toElementWord = (count: number): string => {
  if (count === 1) {
    return "1 element uses";
  }

  return `${count} elements use`;
};

const toColorTarget = (
  group: NearGroup,
  groups: readonly NearGroup[]
): NearGroup | null => {
  const near = groups.filter((other) => {
    const isOther = other.family === group.family && other.key !== group.key;

    return (
      isOther &&
      other.uses > group.uses &&
      nearColor(group.value, other.value, COLOR_DELTA)
    );
  });

  const most = Math.max(0, ...near.map((other) => other.uses));
  const top = near.filter((other) => other.uses === most);

  return toOnly(top);
};

const toRadiusTarget = (
  group: NearGroup,
  groups: readonly NearGroup[],
  radiusWindow: number
): NearGroup | null => {
  const px = group.px ?? 0;

  if (group.uses > RADIUS_RARE_MAX) {
    return null;
  }

  const near = groups.filter((other) => {
    const step = Math.abs((other.px ?? 0) - px);
    const isSameKind = other.family === group.family && other.tag === group.tag;
    const isInWindow = step >= RADIUS_MIN_STEP && step <= radiusWindow;

    return isSameKind && isInWindow && other.uses >= RADIUS_COMMON_MIN;
  });

  const nearest = Math.min(
    Number.POSITIVE_INFINITY,
    ...near.map((other) => Math.abs((other.px ?? 0) - px))
  );

  const top = near.filter(
    (other) => Math.abs((other.px ?? 0) - px) === nearest
  );

  return toOnly(top);
};

const toShown = (group: NearGroup): string => {
  if (isColorFamily(group.family)) {
    return hexOf(group.value) ?? group.value;
  }

  return group.value;
};

const toMessage = (group: NearGroup, target: NearGroup): string => {
  const uses = toElementWord(target.uses);

  if (isColorFamily(group.family)) {
    return `This color ${toShown(group)} is almost ${toShown(target)}, which ${uses}. Use ${toShown(target)}.`;
  }

  return `This radius ${group.px ?? 0} px is almost ${target.px ?? 0} px, which ${uses}.`;
};

const toGroupHits = (
  group: NearGroup,
  groups: readonly NearGroup[],
  radiusWindow: number
): NearValueHit[] => {
  let target = toRadiusTarget(group, groups, radiusWindow);

  if (isColorFamily(group.family)) {
    target = toColorTarget(group, groups);
  }

  if (target === null) {
    return [];
  }

  const message = toMessage(group, target);

  return group.ids.map((id) => ({
    id,
    message,
    target: toShown(target),
    value: toShown(group),
  }));
};

const toNearValueHits = (input: NearValueInput): NearValueHit[] => {
  const groups = toGroups(input.uses);

  return groups
    .flatMap((group) => toGroupHits(group, groups, input.radiusWindow))
    .toSorted((left, right) => left.id - right.id)
    .slice(0, HIT_CAP);
};

export { toNearValueHits };

export type { NearFamily, NearValueHit, NearValueInput, NearValueUse };
