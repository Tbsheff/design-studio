import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import type { ElementClasses } from "./element-classes-model.js";
import { TextWrapChoice } from "./text-wrap-choice.js";
import { useTextWrap } from "./use-text-wrap.js";

interface TextWrapRowProps {
  readonly classes: ElementClasses | null;
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
}

const TextWrapRow = ({
  classes,
  edit,
  selection,
}: TextWrapRowProps): ReactElement => {
  const { error, isReady, onPick, wrap } = useTextWrap(
    edit,
    selection,
    classes
  );

  return (
    <div className="wide">
      <div className="ins-field ins-align-row ins-text-wrap">
        <span className="ins-scrub static">{copy.textWrap}</span>
        <TextWrapChoice isDisabled={!isReady} onPick={onPick} wrap={wrap} />
      </div>
      {error && (
        <p className="ins-note" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export { TextWrapRow };
