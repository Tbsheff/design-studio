import { memo } from "react";
import type { ReactNode } from "react";

import { TokenControl } from "../versions-layers-tokens/token-control.js";
import { sameSpec } from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";
import { NumberInput } from "./number-input.js";
import { useScrub } from "./use-scrub.js";

interface NumberFieldProps {
  spec: NumberSpec;
  short: string;
  icon?: ReactNode;
  id?: string;
  tokens?: boolean;
  className?: string;
}

const NumberFieldView = ({
  spec,
  short,
  icon,
  id: idProp,
  tokens = true,
  className,
}: NumberFieldProps) => {
  const id = idProp ?? `ins-${spec.prop}`;
  const scrub = useScrub(spec);

  return (
    <div className={`ins-field ${className ?? ""}`}>
      <label htmlFor={id} className="ins-scrub" {...scrub}>
        {icon ?? short}
      </label>
      <NumberInput spec={spec} id={id} />
      {tokens && (
        <TokenControl
          prop={spec.prop}
          label={spec.label}
          edit={spec.edit}
          targets={spec.targets}
        />
      )}
    </div>
  );
};

const sameField = (a: NumberFieldProps, b: NumberFieldProps): boolean => {
  const sameIcon = (a.icon === undefined) === (b.icon === undefined);

  return (
    sameIcon &&
    a.short === b.short &&
    a.id === b.id &&
    a.tokens === b.tokens &&
    a.className === b.className &&
    sameSpec(a.spec, b.spec)
  );
};

const NumberField = memo(NumberFieldView, sameField);

export { NumberField };

export { NumberInput } from "./number-input.js";

export type { NumberSpec } from "./number-field-model.js";
