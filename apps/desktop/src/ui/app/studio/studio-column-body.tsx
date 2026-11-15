import { createElement } from "react";
import type { ReactElement } from "react";

import { ColorPickerSlot } from "../../domain/color-picker-slot.js";
import type { ColorPickerSlotProps } from "../../domain/color-picker-slot.js";
import { ColorPickerPopup } from "../../features/inspector/index.js";
import {
  TokensPanel,
  VersionsPanel,
} from "../../features/versions-layers-tokens/index.js";
import type { ColumnTab } from "../../platform/panel-tab";
import { ComponentsPanel } from "../components-panel-host";
import { AssetsPanel } from "./assets-panel";
import { COLUMN_COPY } from "./copy";
import { componentsProps, versionsProps } from "./left-props-panels";
import type { StudioCtx } from "./studio-context";
import { StudioSystem } from "./studio-system";

const toColorPicker = (props: ColorPickerSlotProps): ReactElement =>
  createElement(ColorPickerPopup, props);

const toTokensBody = (ctx: StudioCtx): ReactElement => {
  const { panel } = ctx.core.studioTokens;

  if (panel) {
    return (
      <ColorPickerSlot.Provider value={toColorPicker}>
        {createElement(TokensPanel, panel)}
      </ColorPickerSlot.Provider>
    );
  }

  return <p className="column-note">{COLUMN_COPY.tokensEmpty}</p>;
};

const toColumnBody = (ctx: StudioCtx, tab: ColumnTab): ReactElement => {
  switch (tab) {
    case "layers": {
      return (
        <div
          className="edit-layers-host"
          data-empty={COLUMN_COPY.layersEmpty}
          ref={ctx.ui.setLayersHost}
        />
      );
    }

    case "pages": {
      return (
        <div
          className="column-pages-host"
          data-empty={COLUMN_COPY.pagesEmpty}
          ref={ctx.ui.setPagesHost}
        />
      );
    }

    case "assets": {
      return <AssetsPanel />;
    }

    case "versions": {
      return createElement(VersionsPanel, versionsProps(ctx));
    }

    case "tokens": {
      return toTokensBody(ctx);
    }

    case "components": {
      return createElement(ComponentsPanel, componentsProps(ctx));
    }

    default: {
      return (
        <div className="pane-system">
          <StudioSystem ctx={ctx} />
        </div>
      );
    }
  }
};

export { toColorPicker, toColumnBody };
