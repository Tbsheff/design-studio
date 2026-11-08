import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

interface AddScreenItemProps {
  readonly label: string;
  readonly onPick: () => void;
}

const AddScreenItem = ({ label, onPick }: AddScreenItemProps): ReactElement => (
  <button type="button" role="menuitem" onClick={onPick}>
    <Icon name="doc" size={14} />
    <span>{label}</span>
  </button>
);

export { AddScreenItem };
