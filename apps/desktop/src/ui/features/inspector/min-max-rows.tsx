import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { AddButton } from "./inspector-shared.js";
import { LimitField } from "./limit-field.js";
import type { DirectEdit } from "./use-direct-edit.js";

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

  const openRows = useCallback(() => {
    setOpen(true);
  }, []);

  if (!open && !hasLimitsSet(edit)) {
    return (
      <div className="ins-add-row ins-limits-add">
        <AddButton
          label="Min/Max"
          tip="Add min and max width and height"
          onClick={openRows}
        />
      </div>
    );
  }

  return (
    <div className="ins-grid ins-limits">
      {LIMITS.map((limit) => (
        <LimitField
          key={limit.prop}
          edit={edit}
          label={limit.label}
          prop={limit.prop}
          short={limit.short}
        />
      ))}
    </div>
  );
};

export { MinMaxRows };
