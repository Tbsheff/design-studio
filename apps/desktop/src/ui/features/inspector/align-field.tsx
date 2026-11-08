import { memo } from "react";
import type { ReactElement } from "react";

import { AlignButton } from "./align-button.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { ALIGN_OPTIONS, toAlign } from "./field-model.js";
import { isSameEditValues } from "./use-direct-edit.js";

const AlignFieldView = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => {
  const current = toAlign(edit.values["text-align"]);

  return (
    <div
      className="segmented icons ins-align"
      role="toolbar"
      aria-label={copy.textAlign}
    >
      {ALIGN_OPTIONS.map((option) => (
        <AlignButton
          key={option.value}
          edit={edit}
          icon={option.icon}
          isCurrent={current === option.value}
          label={option.label}
          value={option.value}
        />
      ))}
    </div>
  );
};

const AlignField = memo(AlignFieldView, (first, second) =>
  isSameEditValues(first.edit, second.edit, ["text-align"])
);

export { AlignField };
