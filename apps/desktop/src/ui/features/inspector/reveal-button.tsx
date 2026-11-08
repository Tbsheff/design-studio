import { useCallback } from "react";
import type { ReactElement } from "react";

import { AddButton } from "./add-button.js";
import type { Extra } from "./simple-model.js";

interface RevealButtonProps {
  readonly extra: Extra;
  readonly label: string;
  readonly onReveal: (extra: Extra) => void;
}

const RevealButton = ({
  extra,
  label,
  onReveal,
}: RevealButtonProps): ReactElement => {
  const reveal = useCallback(() => onReveal(extra), [onReveal, extra]);

  return <AddButton label={label} tip={null} onClick={reveal} />;
};

export { RevealButton };
