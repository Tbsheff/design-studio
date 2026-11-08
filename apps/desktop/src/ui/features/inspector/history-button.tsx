import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { InspectorToolButton } from "./inspector-tool-button.js";
import { ToolGlyph } from "./tool-glyph.js";
import { GLYPHS, ICON_SIZE } from "./tools-model.js";

interface Props {
  readonly isRedo: boolean;
  readonly onHistory: (isRedo: boolean) => void;
}

const HistoryButton = ({ isRedo, onHistory }: Props): ReactElement => {
  const handleHistory = useCallback((): void => {
    onHistory(isRedo);
  }, [isRedo, onHistory]);

  if (isRedo) {
    return (
      <InspectorToolButton
        isDisabled={false}
        isPressed={false}
        label="Redo"
        tip="Redo ⇧⌘Z"
        align="end"
        onClick={handleHistory}
      >
        <ToolGlyph path={GLYPHS.redo} />
      </InspectorToolButton>
    );
  }

  return (
    <InspectorToolButton
      isDisabled={false}
      isPressed={false}
      label="Undo"
      tip="Undo ⌘Z"
      align="end"
      onClick={handleHistory}
    >
      <Icon name="undo" size={ICON_SIZE} />
    </InspectorToolButton>
  );
};

export { HistoryButton };
