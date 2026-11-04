import { useCallback, useEffect, useState } from "react";

import type { SelectionContext } from "../../../shared/actions/_core/contracts.js";
import { Icon } from "../../kit/Icon.js";
import { UiSelect } from "../../kit/UiSelect.js";
import { PIN_OPTIONS, pinFields, pinModeOf, pinPatch } from "./constraints.js";
import type { InsetProp, PinAxis, PinMode } from "./constraints.js";
import { write } from "./layout-keys.js";
import { NumberField } from "./number-field.js";
import type { DirectEdit } from "./use-direct-edit.js";

const IN_FLOW = { bottom: "", left: "", position: "", right: "", top: "" };

const isPositioned = (value: string): boolean =>
  value === "absolute" || value === "fixed";

const PositionRows = ({
  edit,
  selection,
}: {
  edit: DirectEdit;
  selection: SelectionContext;
}) => {
  const on = isPositioned(edit.values.position);

  const toggle = () => {
    if (on) {
      write(edit, IN_FLOW);
    } else {
      write(edit, {
        left: selection.styles["offset-left"] || "0px",
        position: "absolute",
        top: selection.styles["offset-top"] || "0px",
      });
    }
  };

  return (
    <>
      <div className="ins-layout-row">
        <button
          type="button"
          className="btn small has-icon ins-abs-toggle"
          aria-pressed={on}
          data-tip={
            on
              ? "Put the element back in the flow"
              : "Take the element out of the flow. X and Y count from the nearest positioned ancestor."
          }
          onClick={toggle}
        >
          <Icon name={on ? "check" : "frame"} size={14} />
          Absolute position
        </button>
      </div>
      {on && <ConstraintRows edit={edit} selection={selection} />}
    </>
  );
};

const INSET_FIELDS: Record<InsetProp, { short: string; label: string }> = {
  bottom: { label: "Bottom", short: "B" },
  left: { label: "Left (X)", short: "X" },
  right: { label: "Right", short: "R" },
  top: { label: "Top (Y)", short: "Y" },
};

const PIN_TIPS: Record<PinAxis, string> = {
  x: "How the element follows when its container gets wider or narrower",
  y: "How the element follows when its container gets taller or shorter",
};

const PIN_RESELECT_MS = [400, 1000, 2000, 3500, 6000];

interface QueuedPins {
  selector: string;
  pins: Partial<Record<PinAxis, { mode: PinMode; from: PinMode }>>;
}

const pinStyles = (
  edit: DirectEdit,
  selection: SelectionContext
): Record<string, string> => {
  const margins = (
    ["margin-top", "margin-right", "margin-bottom", "margin-left"] as const
  ).map((prop) => [prop, edit.values[prop] ?? ""]);

  return { ...selection.styles, ...Object.fromEntries(margins) };
};

const hasPinGeometry = (selection: SelectionContext): boolean =>
  selection.styles["container-width"] !== undefined &&
  selection.styles["pin-left"] !== undefined;

const useQueuedPins = (
  edit: DirectEdit,
  selection: SelectionContext,
  applied: (modes: Partial<Record<PinAxis, PinMode>>) => void
) => {
  const [queued, setQueued] = useState<QueuedPins | null>(null);
  const ready = hasPinGeometry(selection);
  useEffect(() => {
    if (!queued) {
      return;
    }

    if (queued.selector !== selection.selector) {
      return setQueued(null);
    }

    if (!ready) {
      return;
    }

    const patch = (
      Object.entries(queued.pins) as [
        PinAxis,
        { mode: PinMode; from: PinMode },
      ][]
    ).reduce<Record<string, string>>(
      (all, [axis, pin]) => ({
        ...all,
        ...pinPatch(axis, pin.mode, pinStyles(edit, selection), pin.from),
      }),
      {}
    );

    setQueued(null);
    applied(
      Object.fromEntries(
        Object.entries(queued.pins).map(([axis, pin]) => [axis, pin.mode])
      )
    );
    edit.preview(patch, true);
    edit.commit();
  }, [queued, ready, selection, edit, applied]);
  const waiting = queued !== null && !ready;
  const { reselect } = edit;
  useEffect(() => {
    if (!waiting) {
      return;
    }

    const timers = PIN_RESELECT_MS.map((ms) => window.setTimeout(reselect, ms));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [waiting, reselect]);

  const queue = (axis: PinAxis, mode: PinMode, from: PinMode) =>
    setQueued((prev) => ({
      pins: {
        ...(prev?.selector === selection.selector ? prev.pins : {}),
        [axis]: { from: prev?.pins[axis]?.from ?? from, mode },
      },
      selector: selection.selector,
    }));

  return { queue, ready };
};

const PinSelect = ({
  axis,
  mode,
  edit,
  selection,
  onPick,
  ready,
  queue,
}: {
  axis: PinAxis;
  mode: PinMode;
  edit: DirectEdit;
  selection: SelectionContext;
  onPick: (axis: PinAxis, mode: PinMode) => void;
  ready: boolean;
  queue: (axis: PinAxis, mode: PinMode, from: PinMode) => void;
}) => {
  const change = (next: PinMode) => {
    if (next === mode) {
      return;
    }

    onPick(axis, next);

    if (!ready) {
      return queue(axis, next, mode);
    }

    edit.preview(pinPatch(axis, next, pinStyles(edit, selection), mode), true);
    edit.commit();
  };

  return (
    <div
      className="ins-field select ins-pin"
      data-tip={PIN_TIPS[axis]}
      data-tip-align="end"
    >
      <span className="ins-scrub static">{axis === "x" ? "H" : "V"}</span>
      <UiSelect
        className="ins-select"
        aria-label={
          axis === "x" ? "Horizontal constraint" : "Vertical constraint"
        }
        value={mode}
        options={PIN_OPTIONS[axis]}
        onChange={change}
      />
    </div>
  );
};

const usePinModes = (
  selection: SelectionContext
): {
  modes: Record<PinAxis, PinMode>;
  pick: (next: Partial<Record<PinAxis, PinMode>>) => void;
} => {
  const authored = ["left", "right", "top", "bottom"]
    .map((side) => selection.styles[`authored-${side}`] ?? "")
    .join("|");

  const key = `${selection.selector}|${authored}`;

  const [picked, setPicked] = useState<{
    key: string;
    modes: Partial<Record<PinAxis, PinMode>>;
  }>({ key, modes: {} });

  const fresh = picked.key === key ? picked.modes : {};

  const modes = {
    x: fresh.x ?? pinModeOf("x", selection.styles),
    y: fresh.y ?? pinModeOf("y", selection.styles),
  };

  const pick = useCallback(
    (next: Partial<Record<PinAxis, PinMode>>) =>
      setPicked((prev) => ({
        key,
        modes: {
          ...(prev.key.startsWith(`${selection.selector}|`) ? prev.modes : {}),
          ...next,
        },
      })),
    [key, selection.selector]
  );

  return { modes, pick };
};

const ConstraintRows = ({
  edit,
  selection,
}: {
  edit: DirectEdit;
  selection: SelectionContext;
}) => {
  const { modes, pick } = usePinModes(selection);
  const { ready, queue } = useQueuedPins(edit, selection, pick);
  const fields = [...pinFields("x", modes.x), ...pinFields("y", modes.y)];

  return (
    <>
      {fields.length > 0 && (
        <div className="ins-grid">
          {fields.map((prop) => (
            <NumberField
              key={prop}
              short={INSET_FIELDS[prop].short}
              spec={{ edit, label: INSET_FIELDS[prop].label, prop }}
            />
          ))}
        </div>
      )}
      <div
        className="ins-grid ins-constraints"
        role="group"
        aria-label="Constraints"
      >
        <PinSelect
          axis="x"
          mode={modes.x}
          edit={edit}
          selection={selection}
          onPick={(axis, mode) => pick({ [axis]: mode })}
          ready={ready}
          queue={queue}
        />
        <PinSelect
          axis="y"
          mode={modes.y}
          edit={edit}
          selection={selection}
          onPick={(axis, mode) => pick({ [axis]: mode })}
          ready={ready}
          queue={queue}
        />
      </div>
    </>
  );
};

export { PositionRows, isPositioned };
