import { runCommand, TabOrderToggle } from "../../canvas-toolbar-slots.js";
import { PenIcon } from "../../components/DrawLayer.js";
import { PRESETS } from "../../domain/canvas-presets.js";
import type { CanvasSource } from "../../domain/canvas-presets.js";
import { Icon } from "../../kit/Icon.js";
import type { ZoomSetting } from "../../storage.js";
import { VECTOR_TOOLS, useVectorTool, vectorTool } from "../../vectorTool.js";
import {
  type Props,
  ViewportControls,
  SourceControls,
} from "./toolbar-viewport.js";

export { PRESETS } from "../../domain/canvas-presets.js";

export type { CanvasSource } from "../../domain/canvas-presets.js";

export function zoomOptionLabel(setting: ZoomSetting, zoom: number): string {
  return setting === "fit" ? `Fit ${Math.round(zoom * 100)}%` : "Fit";
}

function ThemeSwitch({
  dark,
  onToggle,
}: {
  dark: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="icon-btn theme-switch"
      aria-label="Preview dark mode"
      aria-pressed={dark}
      data-tip={dark ? "Back to the default mode" : "Preview dark mode"}
      onClick={onToggle}
    >
      <Icon name="moon" />
    </button>
  );
}

function LofiSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="btn small ghost select-toggle lofi-toggle"
      aria-pressed={on}
      data-tip={
        on
          ? "Show the real colors and fonts"
          : "Show this direction in grayscale with a hand-drawn font. Your files do not change."
      }
      onClick={onToggle}
    >
      <Icon name="pencil" size={14} />
      <span className="label">Lo-fi look</span>
    </button>
  );
}

function LinksSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="btn small ghost select-toggle links-toggle"
      aria-pressed={on}
      data-tip={on ? "Hide the link arrows" : "Show the link arrows"}
      onClick={onToggle}
    >
      <Icon name="link" size={14} />
      <span className="label">Link arrows</span>
    </button>
  );
}

function RulersSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="btn small ghost select-toggle rulers-toggle"
      aria-pressed={on}
      aria-keyshortcuts="Shift+R"
      data-tip={on ? "Hide rulers" : "Show rulers"}
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
      <span className="label">Rulers</span> <kbd>⇧R</kbd>
    </button>
  );
}

export function VectorToolButtons() {
  const { tool, available } = useVectorTool();

  return (
    <div
      className="ui-tools topbar-tools vector-tools"
      role="group"
      aria-label="Shape tools"
    >
      {VECTOR_TOOLS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.label}
          aria-pressed={available && tool === item.id}
          disabled={!available}
          aria-keyshortcuts={item.id === "pen" ? "Shift+P" : item.keyLabel}
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
      ))}
    </div>
  );
}

function InsertIconButton() {
  return (
    <button
      type="button"
      className="btn small ghost insert-icon-btn"
      aria-label="Insert icon"
      aria-keyshortcuts="I"
      data-tip="Insert an icon into the selected layer"
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
      <span className="label">Icon</span> <kbd>I</kbd>
    </button>
  );
}

function FindPhotoButton() {
  return (
    <button
      type="button"
      className="btn small ghost find-photo-btn"
      aria-label="Find photo"
      data-tip="Find a stock photo for the selected layer"
      onClick={() => runCommand("image.find")}
    >
      <Icon name="image" size={14} />
      <span className="label">Photo</span>
    </button>
  );
}

export function CanvasViewRow(props: Props) {
  return (
    <div
      className="toolbar canvas-viewrow"
      role="toolbar"
      aria-label="View options"
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
          aria-label="Draw"
          aria-keyshortcuts="P"
          data-tip="Draw on the design, then add a comment. Esc exits."
          data-tip-align="end"
          onClick={props.onToggleDraw}
        >
          <PenIcon size={14} />
          <span className="label">Draw</span> <kbd>P</kbd>
        </button>
      )}
      <button
        className="icon-btn small"
        aria-label={props.checking ? "Checking…" : "Check render"}
        data-tip={props.checking ? "Checking render…" : "Check render"}
        data-tip-align="end"
        onClick={props.onCheck}
        disabled={props.checking}
      >
        {props.checking ? (
          <span className="spinner" />
        ) : (
          <Icon name="scan" size={14} />
        )}
      </button>
    </div>
  );
}
