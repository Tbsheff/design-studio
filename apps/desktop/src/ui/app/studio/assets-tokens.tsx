import { Icon } from "@design-studio/ui";
import { createElement, useCallback } from "react";
import type { ReactElement } from "react";

import { ColorPickerSlot } from "../../domain/color-picker-slot.js";
import { TokensPanel } from "../../features/versions-layers-tokens/index.js";
import { toColorPicker } from "./color-picker-render";
import { COLUMN_COPY } from "./copy";
import type { StudioCtxProps } from "./studio-context";

const AssetsTokens = ({ ctx }: StudioCtxProps): ReactElement => {
  const { panel } = ctx.core.studioTokens;
  const { showColumn } = ctx.panes;
  const openSystem = useCallback(() => showColumn("system"), [showColumn]);

  if (panel) {
    return (
      <ColorPickerSlot.Provider value={toColorPicker}>
        {createElement(TokensPanel, panel)}
      </ColorPickerSlot.Provider>
    );
  }

  return (
    <div className="column-list">
      <p className="column-note">{COLUMN_COPY.tokensEmpty}</p>
      <button type="button" className="column-row" onClick={openSystem}>
        <Icon name="palette" size={14} />
        <span className="truncate">{COLUMN_COPY.tokensSetUp}</span>
      </button>
    </div>
  );
};

export { AssetsTokens };
