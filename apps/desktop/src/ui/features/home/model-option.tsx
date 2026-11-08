import { useCallback } from "react";
import type { ReactElement } from "react";

import { RADIO_ROLE } from "./radio-role-model.js";

const MODEL_PREFIX = /^Claude /u;

interface ModelOptionProps {
  readonly id: string;
  readonly label: string;
  readonly isChosen: boolean;
  readonly onModel: (id: string) => void;
}

const toTabIndex = (isChosen: boolean): number => {
  if (isChosen) {
    return 0;
  }

  return -1;
};

const ModelOption = ({
  id,
  label,
  isChosen,
  onModel,
}: ModelOptionProps): ReactElement => {
  const pick = useCallback((): void => {
    onModel(id);
  }, [id, onModel]);

  return (
    <button
      type="button"
      role={RADIO_ROLE}
      className="ui-menu-item"
      aria-checked={isChosen}
      tabIndex={toTabIndex(isChosen)}
      onClick={pick}
    >
      {label.replace(MODEL_PREFIX, "")}
    </button>
  );
};

export { ModelOption };
