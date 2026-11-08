import type { ReactElement } from "react";

import type { VectorView } from "./tools-model.js";
import { VectorButton } from "./vector-button.js";

interface Props {
  readonly items: readonly VectorView[];
  readonly activeId: string | null;
  readonly isAvailable: boolean;
  readonly onToggle: (id: string) => void;
}

const VectorButtons = ({
  items,
  activeId,
  isAvailable,
  onToggle,
}: Props): ReactElement => (
  <>
    {items.map((item) => (
      <VectorButton
        key={item.id}
        item={item}
        isPressed={activeId === item.id}
        isAvailable={isAvailable}
        onToggle={onToggle}
      />
    ))}
  </>
);

export { VectorButtons };
