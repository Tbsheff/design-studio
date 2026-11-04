import { useState } from "react";
import type { MutableRefObject, ReactNode } from "react";

import type {
  InsertKind,
  SelectionContext,
} from "@design-studio/actions/_core/contracts";
import { TRY_VARIANTS_COMMAND } from "@design-studio/actions/_core/element-variants";
import { api, errorText } from "../../api.js";
import {
  collectCommands,
  commandBlocker,
  runCommand,
} from "../../inspector-slots.js";
import { Icon } from "@design-studio/ui";
import type { PreviewPort } from "../../platform/bridge.js";
import { PREVIEW_HISTORY_EVENT } from "../canvas/use-undo-shortcut.js";
import {
  VECTOR_TOOLS,
  useVectorTool,
  vectorTool,
} from "../canvas/vector-tool-model.js";
import type { DirectEditControl } from "./use-direct-edit.js";

interface Props {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  port: MutableRefObject<PreviewPort | null>;
  control: MutableRefObject<DirectEditControl | null>;
  selectMode?: boolean;
  onSelectMode?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const Glyph = ({ d }: { d: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const GLYPHS = {
  directSelect: "M4 2.5l7.5 4-3.25 1L6.5 11zM9.75 9.75l3 3",
  frame: "M5 2v12M11 2v12M2 5h12M2 11h12",
  redo: "M10.5 4l3 3-3 3M13.25 7H6a3.25 3.25 0 0 0 0 6.5h2.5",
  text: "M3.5 3.5h9M8 3.5v9M6.25 12.5h3.5",
};

const INSERTS: { kind: InsertKind; label: string; glyph: string }[] = [
  { glyph: GLYPHS.text, kind: "text", label: "Text" },
  { glyph: GLYPHS.frame, kind: "frame", label: "Frame" },
];

const isHtmlFile = (file: string | undefined): boolean =>
  file !== undefined && /\.html?$/iu.test(file);

const canvasSelectMode = (): boolean =>
  collectCommands().find((command) => command.id === "tool.select")?.title ===
  "Stop selecting";

const ToolButton = ({
  label,
  pressed,
  disabled,
  tip,
  align,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  tip?: string;
  align?: "start" | "end";
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    className="ins-tool"
    aria-label={label}
    aria-pressed={pressed}
    disabled={disabled}
    data-tip={tip ?? label}
    data-tip-align={align}
    onClick={onClick}
  >
    {children}
  </button>
);

const VariantsButton = () => {
  const blocked = commandBlocker(TRY_VARIANTS_COMMAND);

  return (
    <button
      type="button"
      className="ins-tool"
      aria-label="Try variants"
      aria-disabled={blocked ? true : undefined}
      data-tip={
        blocked ? `Try variants: ${blocked}` : "Try variants of this element"
      }
      data-testid="inspector-try-variants"
      onClick={() => runCommand(TRY_VARIANTS_COMMAND)}
    >
      <Icon name="compare" size={14} />
    </button>
  );
};

const VectorButtons = () => {
  const { tool, available } = useVectorTool();

  return (
    <>
      {VECTOR_TOOLS.map((item) => (
        <ToolButton
          key={item.id}
          label={item.label}
          pressed={tool === item.id}
          disabled={!available}
          tip={
            available
              ? `${item.label} ${item.keyLabel}: draw on the canvas`
              : `${item.label}: open the live preview to draw`
          }
          onClick={() => vectorTool.toggle(item.id)}
        >
          <Glyph d={item.glyph} />
        </ToolButton>
      ))}
    </>
  );
};

export const InspectorTools = (props: Props) => {
  const [notice, setNotice] = useState<string | null>(null);
  const last = props.selection.at(-1);

  const htmlSource =
    props.selection.length === 1 && isHtmlFile(last?.source?.file);

  const insertTip = last
    ? htmlSource
      ? undefined
      : "Adding elements works on one element in an HTML file"
    : "Select a parent element first";

  const select = () => {
    if (props.onSelectMode) {
      return props.onSelectMode();
    }

    if (!canvasSelectMode()) {
      runCommand("tool.select");
    }
  };

  const directSelect = () => {
    if (last) {
      props.port.current?.post({
        move: "child",
        selector: last.selector,
        type: "select-relative",
      });
    }
  };

  const history = (redo: boolean) => {
    const own = redo ? props.onRedo : props.onUndo;

    if (own) {
      return own();
    }

    window.dispatchEvent(
      new CustomEvent(PREVIEW_HISTORY_EVENT, { detail: { redo } })
    );
  };

  const insert = async (kind: InsertKind) => {
    const source = last?.source;

    if (!props.directionId || !last || !source) {
      return;
    }

    setNotice(null);

    try {
      await props.control.current?.settle();
      await api.directEdit(props.projectId, props.directionId, {
        insert: kind,
        selector: last.selector,
        source,
        tag: last.tag,
      });
    } catch (error) {
      setNotice(errorText(error));
    }
  };

  return (
    <div className="ins-tools-wrap">
      <div className="ins-tools" role="toolbar" aria-label="Edit tools">
        <ToolButton
          label="Select"
          pressed={props.selectMode}
          align="start"
          onClick={select}
        >
          <Icon name="pointer" size={14} />
        </ToolButton>
        <ToolButton
          label="Select child"
          disabled={!last}
          tip={last ? "Select child" : "Select an element first"}
          onClick={directSelect}
        >
          <Glyph d={GLYPHS.directSelect} />
        </ToolButton>
        <span className="ins-tools-sep" aria-hidden="true" />
        {INSERTS.map((item) => (
          <ToolButton
            key={item.kind}
            label={`Add ${item.label.toLowerCase()}`}
            disabled={insertTip !== undefined}
            tip={
              insertTip
                ? `${item.label}: ${insertTip}`
                : `Add ${item.label.toLowerCase()} inside the selection`
            }
            onClick={() => void insert(item.kind)}
          >
            <Glyph d={item.glyph} />
          </ToolButton>
        ))}
        <VectorButtons />
        <span className="ins-tools-sep" aria-hidden="true" />
        <VariantsButton />
        <span className="ins-tools-end" />
        <ToolButton
          label="Undo"
          tip="Undo ⌘Z"
          align="end"
          onClick={() => history(false)}
        >
          <Icon name="undo" size={14} />
        </ToolButton>
        <ToolButton
          label="Redo"
          tip="Redo ⇧⌘Z"
          align="end"
          onClick={() => history(true)}
        >
          <Glyph d={GLYPHS.redo} />
        </ToolButton>
      </div>
      {notice && (
        <p className="ins-tools-notice" role="alert">
          {notice}
        </p>
      )}
    </div>
  );
};
