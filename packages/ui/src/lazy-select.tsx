import { lazy, Suspense } from "react";
import type { ReactElement, JSX } from "react";

import { Icon } from "./Icon";
import type { UiSelectProps } from "./UiSelect.js";

const UiSelect = lazy(() =>
  (async (): Promise<{
    default: (props: UiSelectProps<string>) => ReactElement;
  }> => {
    const loaded = await import("./UiSelect.js");

    return {
      default: loaded.UiSelect as (props: UiSelectProps<string>) => JSX.Element,
    };
  })()
);

const Placeholder = <OptionValue extends string>(
  props: UiSelectProps<OptionValue>
): ReactElement => {
  const label =
    props.options.find((option) => option.value === props.value)?.label ??
    props.placeholder ??
    "";

  return (
    <span className={`ui-select-root ${props.className ?? ""}`}>
      <button
        id={props.id}
        type="button"
        role="combobox"
        className={`ui-select${props.size === "sm" ? " sm" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={false}
        aria-label={props["aria-label"]}
        disabled={props.disabled}
      >
        {props.icon}
        <span className="ui-select-value truncate">{label}</span>
        <Icon name="chevronDown" size={12} />
      </button>
    </span>
  );
};

export const LazySelect = <OptionValue extends string>(
  props: UiSelectProps<OptionValue>
): ReactElement => (
  <Suspense fallback={<Placeholder {...props} />}>
    <UiSelect {...(props as unknown as UiSelectProps<string>)} />
  </Suspense>
);
