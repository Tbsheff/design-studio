import type { SelectionContext } from "@design-studio/contracts";
import { UiSelect } from "@design-studio/ui";
import { useEffect, useRef, useState } from "react";
import type {
  FocusEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from "react";

import { useLive } from "../../platform/live-store.js";
import { resizeReadout } from "../canvas/use-resize-handles.js";
import { write } from "./layout-keys.js";
import { NumberField } from "./number-field.js";
import {
  SIZE_MODES,
  toParentLayout,
  toSizeFacts,
  toSizeMode,
  toSizePatch,
} from "./sizing.js";
import type { Axis, SizeFacts, SizeMode } from "./sizing.js";
import type { DirectEdit } from "./use-direct-edit.js";

const toLiveFacts = (
  edit: DirectEdit,
  selection: SelectionContext
): SizeFacts => {
  const facts = toSizeFacts(selection.styles);

  const drafted = (["width", "height"] as const).filter((axis) =>
    edit.dirty.includes(axis)
  );

  return drafted.length === 0
    ? facts
    : {
        ...facts,
        authored: {
          ...facts.authored,
          ...Object.fromEntries(
            drafted.map((axis) => [axis, edit.values[axis].trim()])
          ),
        },
      };
};

const toRoundedPx = (value: string): string => {
  const px = Number.parseFloat(value);

  return value.endsWith("px") && Number.isFinite(px)
    ? `${Math.round(px * 10) / 10}px`
    : value;
};

interface FixedDrag {
  readonly axis: Axis;
  readonly edit: DirectEdit;
  readonly parent: ReturnType<typeof toParentLayout>;
  readonly facts: SizeFacts;
  readonly used: string;
}

const startFixedDrag = (
  event: ReactPointerEvent<HTMLLabelElement>,
  fixedDrag: FixedDrag
): void => {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();

  const start = {
    value: Math.round(Number.parseFloat(fixedDrag.used) || 0),
    values: fixedDrag.edit.values,
    x: event.clientX,
  };

  let moved = false;

  const move = (ev: PointerEvent): void => {
    const steps = Math.trunc((ev.clientX - start.x) / 2);

    if (steps === 0 && !moved) {
      return;
    }

    moved = true;
    document.body.classList.add("ins-scrubbing");
    const next = Math.max(0, start.value + steps * (ev.shiftKey ? 10 : 1));
    fixedDrag.edit.preview(
      toSizePatch(
        fixedDrag.axis,
        "fixed",
        start.values,
        fixedDrag.parent,
        `${next}px`,
        fixedDrag.facts
      )
    );
  };

  const stop = (): void => {
    globalThis.removeEventListener("pointermove", move);
    globalThis.removeEventListener("pointerup", stop);
    globalThis.removeEventListener("pointercancel", stop);
    document.body.classList.remove("ins-scrubbing");

    if (!moved) {
      return;
    }

    fixedDrag.edit.commit();

    const eat = (click: MouseEvent): void => {
      click.preventDefault();
      click.stopPropagation();
    };

    globalThis.addEventListener("click", eat, { capture: true, once: true });
    globalThis.setTimeout(
      () => globalThis.removeEventListener("click", eat, { capture: true }),
      0
    );
  };

  globalThis.addEventListener("pointermove", move);
  globalThis.addEventListener("pointerup", stop);
  globalThis.addEventListener("pointercancel", stop);
};

const LiveSize = ({
  axis,
  value,
}: {
  readonly axis: Axis;
  readonly value: number;
}): ReactElement => {
  const short = axis === "width" ? "W" : "H";

  return (
    <div
      className="ins-field ins-size-display"
      role="status"
      aria-label={`${axis === "width" ? "Width" : "Height"} ${value}px while resizing`}
    >
      <span className="ins-scrub static" aria-hidden="true">
        {short}
      </span>
      <input
        className="ins-input num"
        tabIndex={-1}
        aria-hidden="true"
        value={`${value}px`}
        readOnly
      />
    </div>
  );
};

const SizeValue = ({
  axis,
  mode,
  used,
  edit,
  onDrag,
}: {
  readonly axis: Axis;
  readonly mode: SizeMode;
  readonly used: string;
  readonly edit: DirectEdit;
  readonly onDrag: (event: ReactPointerEvent<HTMLLabelElement>) => void;
}): ReactElement => {
  const [editing, setEditing] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const short = axis === "width" ? "W" : "H";
  const name = axis === "width" ? "Width" : "Height";
  useEffect(() => {
    if (editing) {
      wrap.current?.querySelector<HTMLInputElement>("input.ins-input")?.focus();
    }
  }, [editing]);
  useEffect(() => {
    if (mode !== "fixed" && !wrap.current?.contains(document.activeElement)) {
      setEditing(false);
    }
  }, [mode]);

  if (mode === "fixed" || editing) {
    const leave = (event: FocusEvent<HTMLDivElement>): void => {
      const next = event.relatedTarget;

      if (!(next instanceof Node && event.currentTarget.contains(next))) {
        setEditing(false);
      }
    };

    return (
      <div
        ref={wrap}
        style={{ display: "contents" }}
        onBlur={mode === "fixed" ? undefined : leave}
      >
        <NumberField
          short={short}
          spec={{ edit, label: name, min: 0, prop: axis }}
        />
      </div>
    );
  }

  const label =
    SIZE_MODES.find((option) => option.value === mode)?.label ?? mode;

  const px = toRoundedPx(used);

  return (
    <div
      className="ins-field ins-size-display"
      data-tip={`${label}: ${px} now. Type or drag the label to set a fixed ${axis}.`}
    >
      <label
        htmlFor={`ins-${axis}`}
        className="ins-scrub"
        onPointerDown={onDrag}
      >
        {short}
      </label>
      <input
        id={`ins-${axis}`}
        className="ins-input num"
        aria-label={name}
        aria-description={`${label}, ${px}`}
        value={label}
        readOnly
        onFocus={() => setEditing(true)}
        onPointerDown={(event) => {
          event.preventDefault();
          setEditing(true);
        }}
      />
    </div>
  );
};

const SizeRow = ({
  axis,
  edit,
  selection,
}: {
  readonly axis: Axis;
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
}): ReactElement => {
  const parent = toParentLayout(selection.styles);
  const facts = toLiveFacts(edit, selection);
  const mode = toSizeMode(axis, edit.values, parent, facts);
  const name = axis === "width" ? "Width" : "Height";
  const used = selection.styles[`used-${axis}`] ?? edit.values[axis];
  const live = useLive(resizeReadout);
  const resizing = live?.selector === selection.selector ? live : null;

  return (
    <>
      {resizing ? (
        <LiveSize
          axis={axis}
          value={axis === "width" ? resizing.width : resizing.height}
        />
      ) : (
        <SizeValue
          key={selection.selector}
          axis={axis}
          mode={mode}
          used={used}
          edit={edit}
          onDrag={(event) =>
            startFixedDrag(event, { axis, edit, facts, parent, used })
          }
        />
      )}
      <div className="ins-field select ins-size-field">
        <UiSelect
          className="ins-select ins-size-mode"
          aria-label={`${name} sizing`}
          value={mode}
          options={SIZE_MODES}
          onChange={(next: SizeMode) =>
            write(
              edit,
              toSizePatch(axis, next, edit.values, parent, used, facts)
            )
          }
        />
      </div>
    </>
  );
};

export { SizeRow };
