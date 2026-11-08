import { UiSelect } from "@design-studio/ui";
import { memo, useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toModifiedClass, toPlaceholder, toSelectList } from "./field-model.js";
import { isInherited, useVariantScope } from "./use-edit-variant.js";
import { isSameField } from "./use-same-field.js";
import type { FieldProps } from "./use-same-field.js";

const SelectFieldView = ({
  prop,
  label,
  short,
  edit,
  options,
}: FieldProps & { readonly options: string[] }): ReactElement => {
  const value = edit.values[prop];
  const list = useMemo(() => toSelectList(value, options), [value, options]);
  const id = `ins-${prop}`;
  const isInheritedField = isInherited(useVariantScope(), prop);

  const handleOptionPick = useCallback(
    (next: string) => {
      edit.preview({ [prop]: next });
      edit.commit();
    },
    [edit, prop]
  );

  return (
    <div
      className={toModifiedClass(
        "ins-field select",
        "inherited",
        isInheritedField
      )}
    >
      <label htmlFor={id} className="ins-scrub static">
        {short}
      </label>
      <UiSelect
        id={id}
        aria-label={label}
        value={value}
        placeholder={toPlaceholder(edit.mixed.has(prop), copy.dash)}
        options={list}
        onChange={handleOptionPick}
      />
    </div>
  );
};

const SelectField = memo(
  SelectFieldView,
  (first, second) =>
    isSameField(first, second) &&
    first.options.join(",") === second.options.join(",")
);

export { SelectField };
