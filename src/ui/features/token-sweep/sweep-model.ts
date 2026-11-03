import type { ActionState, tokenRoutes } from "./deps.js";

type SweepView = NonNullable<
  ActionState<typeof tokenRoutes.applyToken>["data"]
>;

type SweepChangeView = SweepView["changes"][number];

type SweepKind = SweepChangeView["kind"];

interface SweepGroup {
  readonly changes: readonly SweepChangeView[];
  readonly kind: SweepKind;
}

const KIND_ORDER: readonly SweepKind[] = ["color", "spacing", "radius", "font"];

const VAR_PATTERN = /(?<name>var\(--[\w-]+\))/u;
const LITERAL_PATTERN = /(?<literal>#[\da-f]{3,8}|rgba?\([^)]*\))/iu;

const groupChanges = (changes: readonly SweepChangeView[]): SweepGroup[] => {
  const groups: SweepGroup[] = [];

  for (const kind of KIND_ORDER) {
    const own = changes.filter((change) => change.kind === kind);

    if (own.length > 0) {
      groups.push({ changes: own, kind });
    }
  }

  return groups;
};

const colorOf = (
  change: SweepChangeView,
  side: "after" | "before"
): string | null => {
  if (change.kind !== "color") {
    return null;
  }

  const text = change[side];

  return (
    VAR_PATTERN.exec(text)?.groups?.["name"] ??
    LITERAL_PATTERN.exec(text)?.groups?.["literal"] ??
    null
  );
};

export { colorOf, groupChanges };

export type { SweepChangeView, SweepGroup, SweepKind, SweepView };
