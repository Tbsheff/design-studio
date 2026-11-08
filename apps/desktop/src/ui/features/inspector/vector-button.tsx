import { useCallback } from "react";
import type { ReactElement } from "react";

import { InspectorToolButton } from "./inspector-tool-button.js";
import { ToolGlyph } from "./tool-glyph.js";
import { toVectorTip } from "./tools-model.js";
import type { VectorView } from "./tools-model.js";

interface Props {
  readonly item: VectorView;
  readonly isPressed: boolean;
  readonly isAvailable: boolean;
  readonly onToggle: (id: string) => void;
}

const VectorButton = ({
  item,
  isPressed,
  isAvailable,
  onToggle,
}: Props): ReactElement => {
  const handleToggle = useCallback((): void => {
    onToggle(item.id);
  }, [item.id, onToggle]);

  return (
    <InspectorToolButton
      label={item.label}
      isPressed={isPressed}
      isDisabled={!isAvailable}
      tip={toVectorTip(item.label, item.keyLabel, isAvailable)}
      align={null}
      onClick={handleToggle}
    >
      <ToolGlyph path={item.glyph} />
    </InspectorToolButton>
  );
};

export { VectorButton };
