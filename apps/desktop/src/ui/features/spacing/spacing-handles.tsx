import { useCallback, useMemo, useReducer } from "react";
import type { ReactElement } from "react";

import { resizeReadout, useLive } from "./deps.js";
import type { SelectionContext, SpacingBox } from "./deps.js";
import { SpacingBand } from "./spacing-band.js";
import { bandsOf } from "./spacing-bands.js";
import { isLayout, labelOf, valuesOf } from "./spacing-model.js";
import type { Band, Slot, SpacingValues } from "./spacing-model.js";
import { useChildRects } from "./use-child-rects.js";
import { useMarginKey } from "./use-margin-key.js";
import { useSpacingDrag } from "./use-spacing-drag.js";
import type { SpacingHost, SpacingLive } from "./use-spacing-drag.js";
import { useSpacingInfo } from "./use-spacing-info.js";

import styles from "./spacing.module.css";

interface SpacingHandlesProps {
  readonly host: SpacingHost;
  readonly selection: readonly SelectionContext[];
  readonly zoom: number;
}

const NO_SCALE: SpacingBox["scale"] = [];

const targetOf = (
  host: SpacingHost,
  selection: readonly SelectionContext[],
  resizing: boolean
): SelectionContext | null => {
  const [only] = selection;

  if (!host.enabled || resizing || selection.length !== 1 || !only?.source) {
    return null;
  }

  return only;
};

const tokenOf = (box: SpacingBox | null, slot: Slot): string | null => {
  if (!box) {
    return null;
  }

  if (slot === "row-gap") {
    return box.gap.row.token;
  }

  if (slot === "column-gap") {
    return box.gap.column.token;
  }

  const [group = "", side = ""] = slot.split("-");
  const record = { margin: box.margin, padding: box.padding }[group];

  return record?.[side as keyof typeof box.padding]?.token ?? null;
};

const shownValues = (
  values: SpacingValues,
  live: SpacingLive | null
): SpacingValues => live?.values ?? values;

const labelFor = (
  band: Band,
  values: SpacingValues,
  box: SpacingBox | null,
  live: SpacingLive | null
): string => {
  if (live?.plan.slots.includes(band.slot)) {
    return live.label;
  }

  return labelOf(values[band.slot], tokenOf(box, band.slot));
};

const SpacingHandles = ({
  host,
  selection,
  zoom,
}: SpacingHandlesProps): ReactElement | null => {
  const resizing = useLive(resizeReadout) !== null;
  const target = targetOf(host, selection, resizing);
  const [round, bump] = useReducer((value: number) => value + 1, 0);
  const onSaved = useCallback(() => bump(), []);
  const margin = useMarginKey(target !== null);
  const box = useSpacingInfo(host, target, round);
  const layout = target !== null && isLayout(target.styles);

  const children = useChildRects(
    host,
    target?.selector ?? null,
    target?.rect ?? null,
    layout
  );

  const values = useMemo(() => valuesOf(target?.styles ?? {}), [target]);

  const scale = box?.scale ?? NO_SCALE;
  const drag = useSpacingDrag({ host, onSaved, scale, target, values, zoom });
  const handleBandDown = drag.onBandDown;
  const activeSlots = new Set(drag.live?.plan.slots);

  if (!target) {
    return null;
  }

  const shown = shownValues(values, drag.live);

  const bands = bandsOf({
    children,
    layout,
    margin: margin || drag.live?.plan.property === "margin",
    rect: target.rect,
    values: shown,
  });

  return (
    <div className={styles.layer} data-testid="spacing-handles">
      {bands.map((band) => (
        <SpacingBand
          key={band.id}
          active={activeSlots.has(band.slot)}
          band={band}
          label={labelFor(band, shown, box, drag.live)}
          onDown={handleBandDown}
        />
      ))}
    </div>
  );
};

export { SpacingHandles };

export type { SpacingHandlesProps };
