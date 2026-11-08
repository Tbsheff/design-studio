import { createElement, lazy, Suspense, useCallback } from "react";
import type { ReactElement } from "react";

import { SelectPlaceholder } from "./select-placeholder.js";
import type { UiSelectProps } from "./ui-select-model.js";

const UiSelect = lazy(async () => {
  const loaded = await import("./ui-select.js");

  return { default: loaded.UiSelect };
});

export const LazySelect = <OptionValue extends string>(
  props: UiSelectProps<OptionValue>
): ReactElement => {
  const { options, onChange } = props;

  const handleChange = useCallback(
    (value: string) => {
      const option = options.find((candidate) => candidate.value === value);

      if (option) {
        onChange(option.value);
      }
    },
    [options, onChange]
  );

  const toLabel =
    options.find((option) => option.value === props.value)?.label ??
    props.placeholder ??
    "";

  const fallback = createElement(SelectPlaceholder, {
    ariaLabel: props["aria-label"],
    icon: props.icon,
    id: props.id,
    isDisabled: props.disabled,
    label: toLabel,
    rootClass: props.className ?? "",
    size: props.size,
  });

  const select = createElement(UiSelect, {
    "aria-label": props["aria-label"],
    "aria-labelledby": props["aria-labelledby"],
    className: props.className,
    disabled: props.disabled,
    icon: props.icon,
    id: props.id,
    onChange: handleChange,
    options: props.options,
    placeholder: props.placeholder,
    size: props.size,
    tip: props.tip,
    value: props.value,
  });

  return <Suspense fallback={fallback}>{select}</Suspense>;
};
