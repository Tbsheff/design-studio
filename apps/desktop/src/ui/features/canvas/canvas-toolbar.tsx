import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

import { runCommand, TabOrderToggle } from "../../canvas-toolbar-slots.js";
import type { CanvasSource } from "../../domain/canvas-presets.js";
import { PRESETS } from "../../domain/canvas-presets.js";
import type { ZoomSetting } from "../../platform/storage.js";
import { copy } from "./copy.js";
import { PenIcon } from "./draw-layer.js";
import { ViewportControls, SourceControls } from "./toolbar-viewport.js";
import type { Props } from "./toolbar-viewport.js";
import {
  VECTOR_TOOLS,
  useVectorTool,
  vectorTool,
} from "./vector-tool-model.js";

const ZOOM_100 = 100;

export type { CanvasSource } from "../../domain/canvas-presets.js";

const zoomOptionLabel = (setting: ZoomSetting, zoom: number): string => {
  if (setting === "fit") {
    return `Fit ${Math.round(zoom * ZOOM_100)}%`;
  }

  return "Fit";
};

const ThemeSwitch = ({
  dark,
  onToggle,
}: {
  dark: boolean;
  onToggle: () => void;
}): ReactElement => {
  let datatip: "Preview dark mode" | "Back to the default mode" =
    "Preview dark mode";

  if (dark) {
    datatip = "Back to the default mode";
  }

  return (
    <button
      type="button"
      className="icon-btn theme-switch"
      aria-label={copy.previewDarkMode}
      aria-pressed={dark}
      data-tip={datatip}
      onClick={onToggle}
    >
      <Icon name="moon" />
    </button>
  );
};

const LofiSwitch = ({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}): ReactElement => {
  let datatip2:
    | "Show the real colors and fonts"
    | "Show this direction in grayscale with a hand-drawn font. Your files do not change." =
    "Show this direction in grayscale with a hand-drawn font. Your files do not change.";

  if (on) {
    datatip2 = "Show the real colors and fonts";
  }

  return (
    <button
      type="button"
      className="btn small ghost select-toggle lofi-toggle"
      aria-pressed={on}
      data-tip={datatip2}
      onClick={onToggle}
    >
      <Icon name="pencil" size={14} />
      <span className="label">{copy.loFiLook}</span>
    </button>
  );
};

const LinksSwitch = ({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}): ReactElement => {
  let datatip3: "Hide the link arrows" | "Show the link arrows" =
    "Show the link arrows";

  if (on) {
    datatip3 = "Hide the link arrows";
  }

  return (
    <button
      type="button"
      className="btn small ghost select-toggle links-toggle"
      aria-pressed={on}
      data-tip={datatip3}
      onClick={onToggle}
    >
      <Icon name="link" size={14} />
      <span className="label">{copy.linkArrows}</span>
    </button>
  );
};

const RulersSwitch = ({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}): ReactElement => {
  let datatip4: "Hide rulers" | "Show rulers" = "Show rulers";

  if (on) {
    datatip4 = "Hide rulers";
  }

  return (
    <button
      type="button"
      className="btn small ghost select-toggle rulers-toggle"
      aria-pressed={on}
      aria-keyshortcuts="Shift+R"
      data-tip={datatip4}
      onClick={onToggle}
    >
      <svg
        className="icon"
        width={14}
        height={14}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2.5 2.5h11v4h-11zM5 2.5v2M8 2.5v2M11 2.5v2M2.5 6.5v7h4v-7M2.5 9h2M2.5 11.5h2" />
      </svg>
      <span className="label">{copy.rulers}</span> <kbd>{copy.keyR}</kbd>
    </button>
  );
};

const VectorToolButtons = (): ReactElement => {
  const { tool, available } = useVectorTool();

  return (
    <div
      className="ui-tools topbar-tools vector-tools"
      role="group"
      aria-label={copy.tools}
    >
      {VECTOR_TOOLS.map((item) => {
        let ariakeyshortcuts: string = item.keyLabel;

        if (item.id === "pen") {
          ariakeyshortcuts = "Shift+P";
        }

        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={available && tool === item.id}
            disabled={!available}
            aria-keyshortcuts={ariakeyshortcuts}
            data-tip={`${item.label} ${item.keyLabel}`}
            onClick={() => vectorTool.toggle(item.id)}
          >
            <svg
              className="icon"
              width={14}
              height={14}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d={item.glyph} />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

const InsertIconButton = (): ReactElement => (
  <button
    type="button"
    className="btn small ghost insert-icon-btn"
    aria-label={copy.insertIcon}
    aria-keyshortcuts="I"
    data-tip={copy.insertAnIcon}
    onClick={() => runCommand("icon.insert")}
  >
    <svg
      className="icon"
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 2l1.6 3.6L13.5 6l-2.9 2.6.8 3.9L8 10.6l-3.4 1.9.8-3.9L2.5 6l3.9-.4z" />
    </svg>
    <span className="label">{copy.icon}</span> <kbd>{copy.keyI}</kbd>
  </button>
);

const FindPhotoButton = (): ReactElement => (
  <button
    type="button"
    className="btn small ghost find-photo-btn"
    aria-label={copy.findPhoto}
    data-tip={copy.findAStock}
    onClick={() => runCommand("image.find")}
  >
    <Icon name="image" size={14} />
    <span className="label">{copy.photo}</span>
  </button>
);

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
      {props.theme && (
        <ThemeSwitch dark={props.theme.dark} onToggle={props.theme.onToggle} />
      )}
      {props.lofi && (
        <LofiSwitch on={props.lofi.on} onToggle={props.lofi.onToggle} />
      )}
      {props.links && (
        <LinksSwitch on={props.links.on} onToggle={props.links.onToggle} />
      )}
      {props.rulers && (
        <RulersSwitch on={props.rulers.on} onToggle={props.rulers.onToggle} />
      )}
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
      {props.drawMode !== undefined && (
        <button
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

export { CanvasViewRow, PRESETS, VectorToolButtons, zoomOptionLabel };
