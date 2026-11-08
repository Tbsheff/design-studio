import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { DirectEdit } from "./deps.js";
import { toOnClass } from "./field-model.js";

interface AlignButtonProps {
  readonly edit: DirectEdit;
  readonly icon: IconName;
  readonly isCurrent: boolean;
  readonly label: string;
  readonly value: string;
}

const AlignButton = ({
  edit,
  icon,
  isCurrent,
  label,
  value,
}: AlignButtonProps): ReactElement => {
  const handleAlignPick = useCallback(() => {
    edit.preview({ "text-align": value });
    edit.commit();
  }, [edit, value]);

  return (
    <button
      type="button"
      className={toOnClass(isCurrent)}
      aria-label={label}
      aria-pressed={isCurrent}
      data-tip={label}
      onClick={handleAlignPick}
    >
      <Icon name={icon} size={14} />
    </button>
  );
};

export { AlignButton };
