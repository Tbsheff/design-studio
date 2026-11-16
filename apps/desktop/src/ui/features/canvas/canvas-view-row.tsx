import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

import { TabOrderToggle } from "../../canvas-toolbar-slots.js";
import { copy } from "./copy.js";
import { FindPhotoButton } from "./find-photo-button.js";
import { InsertIconButton } from "./insert-icon-button.js";
import { LinksSwitch } from "./links-switch.js";
import { LofiSwitch } from "./lofi-switch.js";
import { PenIcon } from "./pen-icon.js";
import { RulersSwitch } from "./rulers-switch.js";
import { SourceControls } from "./source-controls.js";
import { ThemeSwitch } from "./theme-switch.js";
import { ViewportControls } from "./toolbar-viewport.js";
import type { Props } from "./toolbar-viewport.js";

const CanvasViewRow = (props: Props): ReactElement => {
  let arialabel: "Checking…" | "Check render" = "Check render";

  if (props.checking) {
    arialabel = "Checking…";
  }

  let datatip5: "Check render" | "Checking render…" = "Check render";

  if (props.checking) {
    datatip5 = "Checking render…";
  }

  let content: ReactNode = <Icon name="scan" size={14} />;

  if (props.checking) {
    content = <span className="spinner" />;
  }

  return (
    <div
      className="toolbar canvas-viewrow"
      role="toolbar"
      aria-label={copy.viewOptions}
    >
      <ViewportControls viewport={props.viewport} />
      {props.addFrame}
      {props.theme && <ThemeSwitch control={props.theme} />}
      {props.lofi && <LofiSwitch control={props.lofi} />}
      {props.links && <LinksSwitch control={props.links} />}
      {props.rulers && <RulersSwitch control={props.rulers} />}
      <div className="toolbar-sep" />
      <SourceControls
        source={props.source}
        onSource={props.onSource}
        hasHead={props.hasHead}
      />
      <div className="spacer" />
      <InsertIconButton />
      <FindPhotoButton />
      <TabOrderToggle />
      {props.drawMode !== null && (
        <button
          type="button"
          className="btn small ghost select-toggle draw-toggle"
          aria-pressed={props.drawMode}
          aria-label={copy.draw}
          aria-keyshortcuts="P"
          data-tip={copy.drawOnThe}
          data-tip-align="end"
          onClick={props.onToggleDraw}
        >
          <PenIcon size={14} />
          <span className="label">{copy.draw}</span> <kbd>{copy.keyP}</kbd>
        </button>
      )}
      <button
        type="button"
        className="icon-btn small"
        aria-label={arialabel}
        data-tip={datatip5}
        data-tip-align="end"
        onClick={props.onCheck}
        disabled={props.checking}
      >
        {content}
      </button>
    </div>
  );
};

export { CanvasViewRow };
