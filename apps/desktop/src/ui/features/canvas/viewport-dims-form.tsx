import { useCallback } from "react";
import type { FormEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { ViewportCustom } from "./use-viewport-custom.js";

interface DimsFormProps {
  readonly custom: ViewportCustom;
}

const ViewportDimsForm = ({ custom }: DimsFormProps): ReactElement => {
  const {
    applyCustom,
    customHeight,
    customWidth,
    onHeightChange,
    onWidthChange,
  } = custom;

  const onSubmit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      applyCustom();
    },
    [applyCustom]
  );

  const onDimKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyCustom();
      }
    },
    [applyCustom]
  );

  return (
    <form className="dims" onSubmit={onSubmit}>
      <input
        name="width"
        aria-label={copy.width}
        value={customWidth}
        onChange={onWidthChange}
        onBlur={applyCustom}
        onKeyDown={onDimKey}
      />
      <span className="x">{copy.times}</span>
      <input
        name="height"
        aria-label={copy.height}
        value={customHeight}
        onChange={onHeightChange}
        onBlur={applyCustom}
        onKeyDown={onDimKey}
      />
    </form>
  );
};

export { ViewportDimsForm };
