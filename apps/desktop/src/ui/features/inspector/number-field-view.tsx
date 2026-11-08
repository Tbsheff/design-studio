import { memo } from "react";
import type { ReactElement } from "react";

import { isSameField } from "./number-field-props-model.js";
import type { NumberFieldProps } from "./number-field-props-model.js";
import { NumberInput } from "./number-input.js";
import { useScrub } from "./use-scrub.js";

const NumberFieldView = ({
  spec,
  short,
  icon,
  id: idProp,
  inputRef,
  toControl,
}: NumberFieldProps): ReactElement => {
  const id = idProp ?? `ins-${spec.prop}`;

  const {
    onClick: handleScrubClick,
    onPointerCancel: handleScrubCancel,
    onPointerDown: handleScrubDown,
    onPointerMove: handleScrubMove,
    onPointerUp: handleScrubUp,
  } = useScrub(spec);

  return (
    <div className="ins-field">
      <label
        htmlFor={id}
        className="ins-scrub"
        role="presentation"
        onClick={handleScrubClick}
        onPointerCancel={handleScrubCancel}
        onPointerDown={handleScrubDown}
        onPointerMove={handleScrubMove}
        onPointerUp={handleScrubUp}
      >
        {icon ?? short}
      </label>
      <NumberInput spec={spec} id={id} inputRef={inputRef} />
      {toControl?.(spec)}
    </div>
  );
};

const MemoNumberField = memo(NumberFieldView, isSameField);

export { MemoNumberField };
