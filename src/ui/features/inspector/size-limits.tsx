import { useState } from "react";

import { Icon, type IconName } from "../../kit/Icon.js";
import { AddButton } from "./inspector-shared.js";
import { write } from "./layout-keys.js";
import { NumberField } from "./number-field.js";
import type { DirectEdit } from "./use-direct-edit.js";

const SELF: { value: string; icon: IconName; label: string }[] = [
  { value: "flex-start", icon: "selfStart", label: "Align self start" },
  { value: "center", icon: "selfCenter", label: "Align self center" },
  { value: "flex-end", icon: "selfEnd", label: "Align self end" },
  { value: "stretch", icon: "selfStretch", label: "Align self stretch" },
];

function selfSlot(value: string): string {
  if (value === "start" || value === "self-start") return "flex-start";
  if (value === "end" || value === "self-end") return "flex-end";
  return value;
}

function AlignSelf({ edit, column }: { edit: DirectEdit; column: boolean }) {
  const current = selfSlot(edit.values["align-self"]);
  return (
    <div
      className={`segmented icons ins-self ${column ? "column" : ""}`}
      role="group"
      aria-label="Align self"
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
            write(edit, {
              "align-self": current === option.value ? "" : option.value,
            })
          }
        >
          <Icon name={option.icon} size={14} />
        </button>
      ))}
    </div>
  );
}

const LIMITS = [
  { prop: "min-width", short: "Min W", label: "Min width" },
  { prop: "max-width", short: "Max W", label: "Max width" },
  { prop: "min-height", short: "Min H", label: "Min height" },
  { prop: "max-height", short: "Max H", label: "Max height" },
] as const;

const UNSET_LIMITS = new Set(["", "auto", "none", "0", "0px"]);

function limitsSet(edit: DirectEdit): boolean {
  return LIMITS.some(
    (limit) => !UNSET_LIMITS.has(edit.values[limit.prop].trim())
  );
}

function MinMaxRows({ edit }: { edit: DirectEdit }) {
  const [open, setOpen] = useState(false);
  if (!open && !limitsSet(edit)) {
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
          spec={{ prop: limit.prop, label: limit.label, edit, min: 0 }}
        />
      ))}
    </div>
  );
}

export { AlignSelf, MinMaxRows };
