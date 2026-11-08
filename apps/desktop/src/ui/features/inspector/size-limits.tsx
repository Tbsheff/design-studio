import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useState } from "react";

import { copy } from "./copy.js";
import { AddButton } from "./inspector-shared.js";
import { NumberField } from "./number-field.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

const SELF: {
  readonly value: string;
  readonly icon: IconName;
  readonly label: string;
}[] = [
  { icon: "selfStart", label: "Align self start", value: "flex-start" },
  { icon: "selfCenter", label: "Align self center", value: "center" },
  { icon: "selfEnd", label: "Align self end", value: "flex-end" },
  { icon: "selfStretch", label: "Align self stretch", value: "stretch" },
];

const selfSlot = (value: string): string => {
  if (value === "start" || value === "self-start") {
    return "flex-start";
  }

  if (value === "end" || value === "self-end") {
    return "flex-end";
  }

  return value;
};

const AlignSelf = ({
  edit,
  isColumn: column,
}: {
  readonly edit: DirectEdit;
  readonly isColumn: boolean;
}): ReactElement => {
  const current = selfSlot(edit.values["align-self"]);

  return (
    <div
      className={`segmented icons ins-self ${column ? "column" : ""}`}
      role="group"
      aria-label={copy.alignSelf}
    >
      {SELF.map((option) => (
        <button
          key={option.value}
          type="button"
          className={current === option.value ? "on" : ""}
          aria-label={option.label}
          aria-pressed={current === option.value}
          data-tip={option.label}
          onClick={() =>
            setEdit(edit, {
              "align-self": current === option.value ? "" : option.value,
            })
          }
        >
          <Icon name={option.icon} size={14} />
        </button>
      ))}
    </div>
  );
};

const LIMITS = [
  { label: "Min width", prop: "min-width", short: "Min W" },
  { label: "Max width", prop: "max-width", short: "Max W" },
  { label: "Min height", prop: "min-height", short: "Min H" },
  { label: "Max height", prop: "max-height", short: "Max H" },
] as const;

const UNSET_LIMITS = new Set(["", "auto", "none", "0", "0px"]);

const hasLimitsSet = (edit: DirectEdit): boolean =>
  LIMITS.some((limit) => !UNSET_LIMITS.has(edit.values[limit.prop].trim()));

const MinMaxRows = ({ edit }: { readonly edit: DirectEdit }): ReactElement => {
  const [open, setOpen] = useState(false);

  if (!open && !hasLimitsSet(edit)) {
    return (
      <div className="ins-add-row ins-limits-add">
        <AddButton
          label="Min/Max"
          tip="Add min and max width and height"
          onClick={() => setOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="ins-grid ins-limits">
      {LIMITS.map((limit) => (
        <NumberField
          key={limit.prop}
          short={limit.short}
          spec={{ edit, label: limit.label, min: 0, prop: limit.prop }}
        />
      ))}
    </div>
  );
};

export { AlignSelf, MinMaxRows };
