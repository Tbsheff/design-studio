import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { InspectorToolButton } from "./inspector-tool-button.js";
import { ICON_SIZE } from "./tools-model.js";

interface Props {
  readonly isSelectMode: boolean;
  readonly onSelect: () => void;
}

const SelectButton = ({ isSelectMode, onSelect }: Props): ReactElement => (
  <InspectorToolButton
    isDisabled={false}
    label="Select"
    isPressed={isSelectMode}
    tip={null}
    align="start"
    onClick={onSelect}
  >
    <Icon name="pointer" size={ICON_SIZE} />
  </InspectorToolButton>
);

export { SelectButton };
