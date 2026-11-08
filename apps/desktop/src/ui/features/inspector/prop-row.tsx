import type {
  ComponentInstance,
  PropSpec,
  PropValue,
} from "@design-studio/contracts/props";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { SheetMode } from "./author-model.js";
import { BooleanProp } from "./boolean-prop.js";
import { copy } from "./copy.js";
import { toPropValue } from "./props-model.js";
import { SelectProp } from "./select-prop.js";
import { TextProp } from "./text-prop.js";

interface PropRowProps {
  readonly instance: ComponentInstance;
  readonly spec: PropSpec;
  readonly isDisabled: boolean;
  readonly onChange: (name: string, value: PropValue | null) => void;
  readonly onAuthor: ((prop: string, mode: SheetMode) => void) | null;
}

const PropRow = ({
  instance,
  spec,
  isDisabled,
  onChange,
  onAuthor,
}: PropRowProps): ReactElement => {
  const value = toPropValue(instance, spec);

  const change = useCallback(
    (next: PropValue | null) => onChange(spec.name, next),
    [onChange, spec.name]
  );

  const author = useCallback(
    (mode: SheetMode) => onAuthor?.(spec.name, mode),
    [onAuthor, spec.name]
  );

  if (instance.dynamic.includes(spec.name)) {
    return (
      <div className="ins-field wide readonly prp-field">
        <span className="ins-scrub static prp-name">{spec.name}</span>
        <span className="ins-value">{copy.setByCode}</span>
      </div>
    );
  }

  if (spec.control === "select") {
    return (
      <SelectProp
        spec={spec}
        value={value}
        isOverridden={spec.name in instance.values}
        isDisabled={isDisabled}
        onChange={change}
        onAuthor={onAuthor && author}
      />
    );
  }

  if (spec.control === "boolean") {
    return (
      <BooleanProp
        spec={spec}
        value={value}
        isDisabled={isDisabled}
        onChange={change}
      />
    );
  }

  return (
    <TextProp
      spec={spec}
      value={value}
      isDisabled={isDisabled}
      onChange={change}
    />
  );
};

export { PropRow };
