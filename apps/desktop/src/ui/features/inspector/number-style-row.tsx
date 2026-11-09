import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import type { ElementClasses } from "./element-classes-model.js";
import { NumberStyleSelects } from "./number-style-selects.js";
import { toOnClass } from "./rows-model.js";
import { useNumberStyle } from "./use-number-style.js";

interface NumberStyleRowProps {
  readonly classes: ElementClasses | null;
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
}

const NumberStyleRow = ({
  classes,
  edit,
  selection,
}: NumberStyleRowProps): ReactElement => {
  const { error, isReady, onFigure, onSlashed, onSpacing, style } =
    useNumberStyle(edit, selection, classes);

  return (
    <div className="wide">
      <div className="ins-field ins-align-row ins-numbers">
        <span className="ins-scrub static">{copy.numbers}</span>
        <NumberStyleSelects
          numbers={style}
          onFigure={onFigure}
          onSpacing={onSpacing}
        />
        <button
          type="button"
          className={toOnClass(style.isSlashed)}
          aria-label={copy.numbersSlashed}
          aria-pressed={style.isSlashed}
          data-tip={copy.numbersSlashed}
          disabled={!isReady}
          onClick={onSlashed}
        >
          {copy.numbersSlashedGlyph}
        </button>
      </div>
      {error && (
        <p className="ins-note" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export { NumberStyleRow };
