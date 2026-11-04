import type { SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useRef } from "react";

import type { ArrangeAction } from "../../../shared/arrange.js";
import { shortcutLabel } from "../../../shared/keymap.js";
import { IS_MAC } from "../../inspector-slots.js";
import {
  ALIGN_TOOLS,
  SPACE_TOOLS,
  arrangeShown,
  minCount,
} from "./arrange-model.js";
import type { Props, Message, Tool } from "./arrange-model.js";
import { useArrange, useArrangeKeys } from "./use-arrange.js";

const ToolButton = ({
  tool,
  disabled,
  why,
  onRun,
}: {
  tool: Tool;
  disabled: boolean;
  why: string | null;
  onRun: (action: ArrangeAction) => void;
}) => {
  const tip = why
    ? `${tool.label}: ${why}`
    : `${tool.label} ${shortcutLabel(tool.key, IS_MAC)}`;

  return (
    <button
      type="button"
      className="ins-tool"
      aria-label={tool.label}
      aria-keyshortcuts={shortcutLabel(tool.key, false)}
      disabled={disabled}
      data-tip={tip}
      onClick={() => onRun(tool.action)}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={tool.glyph} />
      </svg>
    </button>
  );
};

const ArrangeMessage = ({ message }: { message: Message | null }) => {
  if (!message) {
    return null;
  }

  if (message.kind === "ok") {
    return (
      <p className="ins-arrange-ok" role="status">
        <Icon name="check" size={12} />
        <span>{message.text}</span>
      </p>
    );
  }

  return (
    <div
      className={`ins-multi-note ins-arrange-note ${message.kind}`}
      role={message.kind === "error" ? "alert" : "note"}
    >
      <Icon name="alert" size={14} />
      <span>{message.text}</span>
    </div>
  );
};

const ArrangeBar = ({
  selection,
  busy,
  onRun,
}: {
  selection: SelectionContext[];
  busy: boolean;
  onRun: (action: ArrangeAction) => void;
}) => {
  const button = (tool: Tool) => {
    const need = minCount(tool.action, selection);

    const why =
      selection.length < need ? `select ${need} or more elements` : null;

    return (
      <ToolButton
        key={tool.key}
        tool={tool}
        disabled={busy || why !== null}
        why={why}
        onRun={onRun}
      />
    );
  };

  return (
    <div className="ins-tools ins-arrange" role="toolbar" aria-label="Arrange">
      {ALIGN_TOOLS.map(button)}
      <span className="ins-tools-sep" aria-hidden="true" />
      {SPACE_TOOLS.map(button)}
    </div>
  );
};

const InspectorArrange = (props: Props) => {
  const root = useRef<HTMLDivElement>(null);
  const arrange = useArrange(props);

  const active =
    props.editable && props.selection.length > 0 && props.directionId !== null;

  useArrangeKeys(root, active, (action) => void arrange.run(action));
  const shown = props.showBar && active && arrangeShown(props.selection);

  return (
    <div
      ref={root}
      className="ins-arrange-wrap"
      data-shown={shown || undefined}
    >
      {shown && (
        <ArrangeBar
          selection={props.selection}
          busy={arrange.busy}
          onRun={(action) => void arrange.run(action)}
        />
      )}
      <ArrangeMessage message={arrange.message} />
    </div>
  );
};

export { InspectorArrange };
