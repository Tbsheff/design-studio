import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useState } from "react";

import { copy } from "./copy.js";
import { expandBox, SIDES } from "./css-values.js";
import type { ShiftPart, Side } from "./css-values.js";
import { NumberField, PlainNumberField } from "./number-field.js";
import { proxyEdit } from "./proxy-edit.js";
import type { DirectEdit } from "./use-direct-edit.js";

const CORNERS: {
  readonly side: Side;
  readonly short: string;
  readonly label: string;
}[] = [
  { label: "Top left radius", short: "TL", side: "top" },
  { label: "Top right radius", short: "TR", side: "right" },
  { label: "Bottom left radius", short: "BL", side: "left" },
  { label: "Bottom right radius", short: "BR", side: "bottom" },
];

const joinCorners = (corners: Record<Side, string>): string => {
  const values = SIDES.map((side) => corners[side] || "0");

  return values.every((value) => value === values[0])
    ? (values[0] ?? "0")
    : values.join(" ");
};

const cornersOf = (radius: string): Record<Side, string> =>
  expandBox(radius.split("/")[0]);

const cornerPart = (side: Side): ShiftPart => ({
  key: side,
  map: (raw, change) =>
    joinCorners({
      ...cornersOf(raw),
      [side]: change(cornersOf(raw)[side] || "0"),
    }),
});

const ALL_CORNERS: ShiftPart = {
  key: "all",
  map: (raw, change) => {
    const corners = cornersOf(raw);

    return joinCorners(
      Object.fromEntries(
        SIDES.map((side) => [side, change(corners[side] || "0")])
      ) as Record<Side, string>
    );
  },
};

const isDifferent = (radius: string): boolean => {
  const corners = cornersOf(radius);

  return SIDES.some((side) => corners[side] !== corners.top);
};

const RadiusField = ({
  edit,
  short = "R",
}: {
  readonly edit: DirectEdit;
  readonly short?: string;
}): ReactElement => {
  const [split, setSplit] = useState(() =>
    isDifferent(edit.values["border-radius"])
  );

  const radius = edit.values["border-radius"];
  const corners = cornersOf(radius);

  const toggle = (
    <button
      type="button"
      className="icon-btn small ins-toggle"
      aria-label={copy.independentCorners}
      aria-pressed={split}
      data-tip={split ? "Set all corners together" : "Set each corner"}
      data-tip-align="end"
      onClick={() => setSplit((on) => !on)}
    >
      <Icon name="corners" size={14} />
    </button>
  );

  if (!split) {
    return (
      <div className="ins-radius">
        <NumberField
          short={short}
          spec={{
            edit: proxyEdit(
              edit,
              "border-radius",
              radius,
              (value) => ({ "border-radius": value }),
              ["border-radius"],
              { isMixed: null, part: ALL_CORNERS }
            ),
            label: "Border radius",
            min: 0,
            prop: "border-radius",
          }}
        />
        {toggle}
      </div>
    );
  }

  return (
    <div className="ins-radius split">
      <div className="ins-grid">
        {CORNERS.map(({ side, short, label }) => (
          <PlainNumberField
            key={side}
            id={`ins-radius-${side}`}
            short={short}
            spec={{
              edit: proxyEdit(
                edit,
                "border-radius",
                corners[side],
                (value) => ({
                  "border-radius": joinCorners({ ...corners, [side]: value }),
                }),
                ["border-radius"],
                { isMixed: null, part: cornerPart(side) }
              ),
              label,
              min: 0,
              prop: "border-radius",
            }}
          />
        ))}
      </div>
      {toggle}
    </div>
  );
};

export { joinCorners, RadiusField };
