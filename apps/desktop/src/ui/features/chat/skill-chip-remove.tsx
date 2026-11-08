import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

const CLOSE_ICON_SIZE = 11;

const SkillChipRemove = ({
  id,
  onRemove,
}: {
  id: string;
  onRemove: (id: string) => void;
}): ReactElement => {
  const remove = useCallback(() => onRemove(id), [id, onRemove]);

  return (
    <button type="button" aria-label={`Remove skill ${id}`} onClick={remove}>
      <Icon name="close" size={CLOSE_ICON_SIZE} />
    </button>
  );
};

export { SkillChipRemove };
