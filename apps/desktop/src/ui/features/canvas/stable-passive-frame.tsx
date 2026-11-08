import { memo } from "react";
import type { RefObject, ReactElement } from "react";

import type { LabelProps } from "./frame-label.js";
import { PassiveFrame } from "./passive-frame.js";
import type { PassiveProps } from "./passive-frame.js";

type PassiveEntry = PassiveProps;

interface StablePassiveProps {
  readonly id: string;
  readonly sig: string;
  readonly entries: RefObject<Map<string, PassiveEntry>>;
}

const toLiveLabel = (cur: LabelProps, live: () => LabelProps): LabelProps => {
  const label: LabelProps = {
    ...cur,
    onActivate: (frame): void => live().onActivate(frame),
    onNudge: (frame, dx, dy): void => live().onNudge(frame, dx, dy),
    onPointerDown: (event, frame): void => live().onPointerDown(event, frame),
    onRemove: (frame): void => live().onRemove(frame),
    onResizeStart: (event, frame, edge): void =>
      live().onResizeStart(event, frame, edge),
  };

  if (cur.onBodyPointerDown) {
    label.onBodyPointerDown = (event, frame, body): void =>
      live().onBodyPointerDown?.(event, frame, body);
  }

  return label;
};

const toNextLoad =
  (entries: RefObject<Map<string, PassiveEntry>>, id: string) =>
  (frameId: string): void => {
    entries.current.get(id)?.onNextLoad(frameId);
  };

const StablePassiveView = ({
  id,
  entries,
}: StablePassiveProps): ReactElement | null => {
  const cur = entries.current.get(id);

  if (!cur) {
    return null;
  }

  const live = (): PassiveProps => entries.current.get(id) ?? cur;

  return (
    <PassiveFrame
      frame={cur.frame}
      src={cur.src}
      nextSrc={cur.nextSrc}
      pending={cur.pending}
      sandbox={cur.sandbox}
      offset={cur.offset}
      label={toLiveLabel(cur.label, () => live().label)}
      register={cur.register}
      frameRef={cur.frameRef}
      onNextLoad={toNextLoad(entries, id)}
    />
  );
};

const areSameStablePassive = (
  first: StablePassiveProps,
  second: StablePassiveProps
): boolean =>
  first.sig === second.sig &&
  first.entries === second.entries &&
  first.id === second.id;

const StablePassiveFrame = memo(StablePassiveView, areSameStablePassive);

export { StablePassiveFrame };

export type { PassiveEntry };
