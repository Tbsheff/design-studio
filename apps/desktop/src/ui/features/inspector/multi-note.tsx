import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

interface Props {
  readonly reason: string | null;
}

const ICON_SIZE = 14;

const MultiNote = ({ reason }: Props): ReactElement | null => {
  if (!reason) {
    return null;
  }

  return (
    <div className="ins-multi-note" role="note">
      <Icon name="alert" size={ICON_SIZE} />
      <span>{reason}</span>
    </div>
  );
};

export { MultiNote };
