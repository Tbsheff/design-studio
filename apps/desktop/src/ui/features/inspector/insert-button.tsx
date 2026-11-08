import type { InsertKind } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { InspectorToolButton } from "./inspector-tool-button.js";
import { ToolGlyph } from "./tool-glyph.js";
import { toInsertItemTip } from "./tools-model.js";
import type { InsertItem } from "./tools-model.js";

interface Props {
  readonly item: InsertItem;
  readonly insertTip: string | null;
  readonly onInsert: (kind: InsertKind) => void;
}

const InsertButton = ({ item, insertTip, onInsert }: Props): ReactElement => {
  const handleInsert = useCallback((): void => {
    onInsert(item.kind);
  }, [item.kind, onInsert]);

  return (
    <InspectorToolButton
      isPressed={false}
      label={`Add ${item.label.toLowerCase()}`}
      isDisabled={insertTip !== null}
      tip={toInsertItemTip(item, insertTip)}
      align={null}
      onClick={handleInsert}
    >
      <ToolGlyph path={item.glyph} />
    </InspectorToolButton>
  );
};

export { InsertButton };
