import type { PropSpec, PropValue } from "@design-studio/contracts/props";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { AUTHOR_OPTIONS, toAuthorMode } from "./author-model.js";
import type { SheetMode } from "./author-model.js";
import { toClassName } from "./class-name-model.js";
import { copy } from "./copy.js";
import { InspectorSelect } from "./inspector-select.js";
import { toDraftText, toOptionLabel, toSelectList } from "./props-model.js";

interface SelectPropProps {
  readonly spec: PropSpec;
  readonly value: PropValue | null;
  readonly isOverridden: boolean;
  readonly isDisabled: boolean;
  readonly onChange: (value: PropValue | null) => void;
  readonly onAuthor: ((mode: SheetMode) => void) | null;
}

const SelectProp = ({
  spec,
  value,
  isOverridden,
  isDisabled,
  onChange,
  onAuthor,
}: SelectPropProps): ReactElement => {
  const current = toDraftText(value);

  const options = useMemo(() => {
    const list = toSelectList(current, spec.options ?? []);

    const base = list.map((option) => ({
      label: toOptionLabel(option, spec),
      value: option,
    }));

    if (!onAuthor) {
      return base;
    }

    return [...base, ...AUTHOR_OPTIONS];
  }, [current, spec, onAuthor]);

  const pick = useCallback(
    (next: string) => {
      const mode = toAuthorMode(next);

      if (mode && onAuthor) {
        onAuthor(mode);
      } else if (next === "") {
        onChange(null);
      } else {
        onChange(next);
      }
    },
    [onAuthor, onChange]
  );

  return (
    <div
      className={toClassName(
        "ins-field select prp-field",
        isOverridden && "set"
      )}
    >
      <label
        htmlFor={`prp-${spec.name}`}
        className="ins-scrub static prp-name"
        data-tip={spec.name}
      >
        {spec.name}
      </label>
      <InspectorSelect
        id={`prp-${spec.name}`}
        label={`${spec.name} prop`}
        value={current}
        placeholder={copy.dash}
        isDisabled={isDisabled}
        options={options}
        onChange={pick}
      />
    </div>
  );
};

export { SelectProp };
