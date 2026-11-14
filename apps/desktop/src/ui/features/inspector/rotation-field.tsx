import type { ReactElement, RefObject } from "react";
import { useEffect, useMemo } from "react";

import { focusStageQuietly } from "../../platform/focus.js";
import { rotationCopy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { toRotationDisplay } from "./flip-model.js";
import { NumberField } from "./number-field.js";

const ROTATE_SHIFT_STEP = 15;

const RotationField = ({
  edit,
  inputRef,
}: {
  readonly edit: DirectEdit;
  readonly inputRef: RefObject<HTMLInputElement | null>;
}): ReactElement => {
  const isMixed = edit.mixed.has("rotate");
  const display = toRotationDisplay(edit.values.rotate);

  const spec = useMemo(() => {
    const base = {
      edit,
      label: rotationCopy.label,
      prop: "rotate" as const,
      shiftStep: ROTATE_SHIFT_STEP,
      unit: "deg",
    };

    if (isMixed) {
      return base;
    }

    return { ...base, display };
  }, [display, edit, isMixed]);

  useEffect(() => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === "Enter" && document.activeElement === input) {
        focusStageQuietly();
      }
    };

    input.addEventListener("keyup", onKeyUp);

    return (): void => input.removeEventListener("keyup", onKeyUp);
  }, [inputRef]);

  return (
    <div className="ins-grid" data-tip={rotationCopy.tip}>
      <NumberField short={rotationCopy.short} spec={spec} inputRef={inputRef} />
    </div>
  );
};

export { RotationField };
