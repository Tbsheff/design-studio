import type { ReactElement } from "react";

import { InspectorToolButton } from "./inspector-tool-button.js";
import { ToolGlyph } from "./tool-glyph.js";
import { GLYPHS, toChildTip } from "./tools-model.js";

interface Props {
  readonly hasSelection: boolean;
  readonly onSelectChild: () => void;
}

const SelectChildButton = ({
  hasSelection,
  onSelectChild,
}: Props): ReactElement => (
  <InspectorToolButton
    isPressed={false}
    label="Select child"
    isDisabled={!hasSelection}
    tip={toChildTip(hasSelection)}
    align={null}
    onClick={onSelectChild}
  >
    <ToolGlyph path={GLYPHS.directSelect} />
  </InspectorToolButton>
);

export { SelectChildButton };
