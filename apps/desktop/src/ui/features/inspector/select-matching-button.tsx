import type { MatchKind } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { MatchOption } from "./select-matching-model.js";

interface Props {
  readonly option: MatchOption;
  readonly onPick: (by: MatchKind) => void;
}

const SelectMatchingButton = ({ option, onPick }: Props): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(option.by);
  }, [onPick, option.by]);

  return (
    <button
      type="button"
      className="ins-add-link"
      data-tip={option.tip}
      onClick={handlePick}
    >
      {option.label}
    </button>
  );
};

export { SelectMatchingButton };
