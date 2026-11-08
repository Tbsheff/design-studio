import { memo } from "react";
import type { ReactNode, ReactElement } from "react";

import { TokenControl } from "../versions-layers-tokens/token-control.js";
import { sameSpec } from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";
import { NumberInput } from "./number-input.js";
import { useScrub } from "./use-scrub.js";

interface NumberFieldProps {
  readonly spec: NumberSpec;
  readonly short: string;
  readonly icon?: ReactNode;
  readonly id?: string;
  readonly hasTokens: boolean;
  readonly className?: string;
}

const NumberFieldView = ({
  spec,
  short,
  icon,
  id: idProp,
  hasTokens: tokens,
  className,
}: NumberFieldProps): ReactElement => {
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

const isSameField = (
  first: NumberFieldProps,
  second: NumberFieldProps
): boolean => {
  const sameIcon = (first.icon === undefined) === (second.icon === undefined);

  return (
    sameIcon &&
    first.short === second.short &&
    first.id === second.id &&
    first.hasTokens === second.hasTokens &&
    first.className === second.className &&
    sameSpec(first.spec, second.spec)
  );
};

const MemoNumberField = memo(NumberFieldView, isSameField);

type SharedFieldProps = Omit<NumberFieldProps, "hasTokens">;

const NumberField = ({
  spec,
  short,
  icon,
  id,
  className,
}: SharedFieldProps): ReactElement => (
  <MemoNumberField
    spec={spec}
    short={short}
    icon={icon}
    id={id}
    className={className}
    hasTokens
  />
);

const PlainNumberField = ({
  spec,
  short,
  icon,
  id,
  className,
}: SharedFieldProps): ReactElement => (
  <MemoNumberField
    spec={spec}
    short={short}
    icon={icon}
    id={id}
    className={className}
    hasTokens={false}
  />
);

export { NumberField, PlainNumberField };

export { NumberInput } from "./number-input.js";

export type { NumberSpec } from "./number-field-model.js";
