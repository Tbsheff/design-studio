import type { PropSpec, PropValue } from "@design-studio/contracts/props";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { toClassName } from "./class-name-model.js";

interface BooleanPropProps {
  readonly spec: PropSpec;
  readonly value: PropValue | null;
  readonly isDisabled: boolean;
  readonly onChange: (value: PropValue | null) => void;
}

const BooleanProp = ({
  spec,
  value,
  isDisabled,
  onChange,
}: BooleanPropProps): ReactElement => {
  const isOn = value === true || value === "true";
  const toggle = useCallback(() => onChange(!isOn), [onChange, isOn]);

  return (
    <div className="prp-bool">
      <span className="prp-name" id={`prp-${spec.name}-label`}>
        {spec.name}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-labelledby={`prp-${spec.name}-label`}
        className={toClassName("prp-switch", isOn && "on")}
        disabled={isDisabled}
        onClick={toggle}
      >
        <span className="prp-switch-knob" />
      </button>
    </div>
  );
};

export { BooleanProp };
