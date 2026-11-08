import { memo } from "react";
import type { ReactElement, RefObject } from "react";

import { isInherited, useVariantScope } from "./edit-variant.js";
import { sameSpec } from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";
import {
  toInputClass,
  toPlaceholder,
  toRefusedTip,
} from "./number-input-model.js";
import { useNumberInput } from "./use-number-input.js";

interface InputProps {
  readonly spec: NumberSpec;
  readonly id?: string;
  readonly className?: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
}

const NumberInputView = ({
  spec,
  id,
  className,
  inputRef,
}: InputProps): ReactElement => {
  const input = useNumberInput(spec);
  const { blur, change, focus, keyDown, mouseUp, pointerDown } = input;
  const inherited = isInherited(useVariantScope(), spec.prop);

  return (
    <input
      ref={inputRef}
      id={id}
      className={toInputClass(className ?? "", inherited)}
      aria-label={spec.label}
      value={input.shown}
      spellCheck={false}
      autoComplete="off"
      placeholder={toPlaceholder(input.isMixed)}
      aria-invalid={input.isRefused}
      data-tip={toRefusedTip(input.isRefused)}
      onChange={change}
      onKeyDown={keyDown}
      onPointerDown={pointerDown}
      onMouseUp={mouseUp}
      onFocus={focus}
      onBlur={blur}
    />
  );
};

const NumberInput = memo(
  NumberInputView,
  (first, second) =>
    first.id === second.id &&
    first.className === second.className &&
    first.inputRef === second.inputRef &&
    sameSpec(first.spec, second.spec)
);

export { NumberInput };

export type { InputProps };
