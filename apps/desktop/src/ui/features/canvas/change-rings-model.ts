import type {
  AnchorQuery,
  SelectionContext,
  StudioEvent,
} from "@design-studio/contracts";

type ChangeKind = "added" | "removed" | "style" | "text";

interface ChangeItem {
  readonly file: string;
  readonly hunk: number;
  readonly kind: ChangeKind;
  readonly layerId: string;
  readonly line: number;
  readonly tag: string;
}

interface ChangeList {
  readonly from: string;
  readonly items: readonly ChangeItem[];
  readonly to: string;
}

type ChangeRect = SelectionContext["rect"];

interface ChangeRing {
  readonly isStale: boolean;
  readonly isUndone: boolean;
  readonly item: ChangeItem;
  readonly rect: ChangeRect | null;
  readonly selector: string | null;
}

interface ChangeSpot {
  readonly directionId: string;
  readonly from: string;
  readonly key: number;
  readonly rings: readonly ChangeRing[];
  readonly step: number | null;
  readonly to: string;
}

interface SpotTarget {
  readonly directionId: string;
  readonly versionId: string;
}

const MAIN_DIRECTION = "main";

const DESCRIBE_TRIES = 5;

const DESCRIBE_WAIT_MS = 600;

const DESCRIBE_TIMEOUT_MS = 1500;

const ZOOM_WAIT_MS = 160;

const QUOTE = /["\\]/gu;

const toEscaped = (char: string): string => `\\${char}`;

const toLocSelector = (layerId: string): string => {
  const escaped = layerId.replaceAll(QUOTE, toEscaped);

  return `[data-studio-loc="${escaped}"]`;
};

const toAnchorQueries = (items: readonly ChangeItem[]): AnchorQuery[] =>
  items.map((item) => ({
    id: item.layerId,
    selector: toLocSelector(item.layerId),
    sourceLoc: item.layerId,
    tag: item.tag,
    textSnippet: "",
  }));

const toRings = (
  items: readonly ChangeItem[],
  contexts: readonly (SelectionContext | null)[]
): ChangeRing[] =>
  items.map((entry, index) => {
    const found = contexts[index] ?? null;

    if (!found) {
      return {
        isStale: false,
        isUndone: false,
        item: entry,
        rect: null,
        selector: null,
      };
    }

    return {
      isStale: false,
      isUndone: false,
      item: entry,
      rect: found.rect,
      selector: found.selector,
    };
  });

const toFoundCount = (rings: readonly ChangeRing[]): number =>
  rings.filter((ring) => ring.rect !== null).length;

const isMostFound = (rings: readonly ChangeRing[]): boolean =>
  rings.length === 0 || toFoundCount(rings) * 2 >= rings.length;

const toEventDirection = (event: StudioEvent): string | null => {
  if (event.type !== "version.created") {
    return null;
  }

  return event.directionId ?? event.version.directionId;
};

const toSpotTarget = (
  event: StudioEvent,
  directionId: string | null,
  since: number
): SpotTarget | null => {
  if (event.type !== "version.created" || event.ts < since) {
    return null;
  }

  const { meta } = event.version;
  const eventDirection = toEventDirection(event) ?? MAIN_DIRECTION;
  const wanted = directionId ?? MAIN_DIRECTION;

  if (eventDirection !== wanted) {
    return null;
  }

  if (meta.kind !== "run" && meta.origin !== "mcp") {
    return null;
  }

  return { directionId: eventDirection, versionId: event.version.id };
};

const toSpot = (
  list: ChangeList,
  target: SpotTarget,
  found: readonly ChangeRing[]
): ChangeSpot => ({
  directionId: target.directionId,
  from: list.from,
  key: Date.now(),
  rings: found,
  step: null,
  to: list.to,
});

const toNextStep = (spot: ChangeSpot): number | null => {
  const count = spot.rings.length;

  if (count === 0) {
    return null;
  }

  return ((spot.step ?? -1) + 1) % count;
};

const toRingAt = (spot: ChangeSpot, step: number | null): ChangeRing | null => {
  if (step === null) {
    return null;
  }

  return spot.rings[step] ?? null;
};

const toStepRing = (spot: ChangeSpot | null): ChangeRing | null => {
  if (!spot || spot.step === null) {
    return null;
  }

  return spot.rings[spot.step] ?? null;
};

const toHunkCount = (spot: ChangeSpot): number => {
  const ring = toStepRing(spot);

  if (!ring) {
    return 0;
  }

  return spot.rings.filter(
    (entry) =>
      entry.item.hunk === ring.item.hunk && entry.item.file === ring.item.file
  ).length;
};

const toSpotWithout = (
  spot: ChangeSpot,
  ring: ChangeRing
): ChangeSpot | null => {
  const kept = spot.rings.filter(
    (entry) =>
      entry.item.hunk !== ring.item.hunk || entry.item.file !== ring.item.file
  );

  if (kept.length === 0) {
    return null;
  }

  return { ...spot, rings: kept, step: null };
};

const isSameRing = (left: ChangeRing, right: ChangeRing): boolean =>
  left.item.layerId === right.item.layerId &&
  left.item.kind === right.item.kind;

const toOpenStep = (
  rings: readonly ChangeRing[],
  after: number
): number | null => {
  for (let offset = 1; offset <= rings.length; offset += 1) {
    const at = (after + offset) % rings.length;

    if (rings[at]?.isUndone === false) {
      return at;
    }
  }

  return null;
};

const toSpotUndone = (spot: ChangeSpot, ring: ChangeRing): ChangeSpot => {
  const rings = spot.rings.map((entry) => {
    if (!isSameRing(entry, ring)) {
      return entry;
    }

    return { ...entry, isUndone: true };
  });

  return { ...spot, rings, step: toOpenStep(rings, spot.step ?? -1) };
};

const toSpotStale = (spot: ChangeSpot, ring: ChangeRing): ChangeSpot => ({
  ...spot,
  rings: spot.rings.map((entry) => {
    if (!isSameRing(entry, ring)) {
      return entry;
    }

    return { ...entry, isStale: true };
  }),
});

export {
  DESCRIBE_TIMEOUT_MS,
  DESCRIBE_TRIES,
  DESCRIBE_WAIT_MS,
  ZOOM_WAIT_MS,
  isMostFound,
  toAnchorQueries,
  toFoundCount,
  toHunkCount,
  toNextStep,
  toRingAt,
  toRings,
  toSpot,
  toSpotStale,
  toSpotTarget,
  toSpotUndone,
  toSpotWithout,
  toStepRing,
};

export type {
  ChangeItem,
  ChangeKind,
  ChangeList,
  ChangeRect,
  ChangeRing,
  ChangeSpot,
  SpotTarget,
};
