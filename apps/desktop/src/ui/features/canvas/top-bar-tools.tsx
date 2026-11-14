import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { KeyId } from "../../../shared/keymap.js";
import { tipWithKey } from "../../canvas-toolbar-slots.js";
import { copy } from "./copy.js";
import { setToolsBar } from "./tools-bar-store.js";
import type { CanvasTool } from "./top-bar-menu-model.js";
import { TopBarToolButton } from "./top-bar-tool-button.js";
import type { ToolId } from "./top-bar-tool-button.js";

interface ToolSpec {
  readonly icon: IconName;
  readonly id: ToolId;
  readonly keyId: KeyId;
  readonly label: string;
  readonly shortcut: string;
}

const DRAW_TOOLS: readonly ToolSpec[] = [
  {
    icon: "pointer",
    id: "select",
    keyId: "tool-select",
    label: copy.select,
    shortcut: "V",
  },
  {
    icon: "hand",
    id: "hand",
    keyId: "tool-hand",
    label: copy.hand,
    shortcut: "H",
  },
  {
    icon: "frame",
    id: "frame",
    keyId: "tool-frame",
    label: copy.frame,
    shortcut: "F",
  },
  {
    icon: "square",
    id: "shape",
    keyId: "tool-rect",
    label: copy.rectTool,
    shortcut: "R",
  },
  {
    icon: "penTool",
    id: "pen",
    keyId: "tool-pen",
    label: copy.pen,
    shortcut: "P",
  },
  {
    icon: "type",
    id: "text",
    keyId: "tool-text",
    label: copy.text,
    shortcut: "T",
  },
];

const NOTE_TOOLS: readonly ToolSpec[] = [
  {
    icon: "comment",
    id: "comment",
    keyId: "tool-comment",
    label: copy.comment,
    shortcut: "C",
  },
  {
    icon: "protoLink",
    id: "prototype",
    keyId: "tool-link",
    label: copy.prototypeLink,
    shortcut: "L",
  },
];

interface Availability {
  readonly commentAvailable: boolean;
  readonly vectorAvailable: boolean;
}

const toOffReason = (id: ToolId, available: Availability): string | null => {
  if (id === "comment" && !available.commentAvailable) {
    return copy.commentsWorkOnThe;
  }

  if ((id === "shape" || id === "pen") && !available.vectorAvailable) {
    return copy.vectorOffTip;
  }

  return null;
};

const toToolButton = (
  spec: ToolSpec,
  tool: CanvasTool,
  available: Availability,
  onTool: (next: ToolId) => void
): ReactElement => {
  const offReason = toOffReason(spec.id, available);

  return (
    <TopBarToolButton
      key={spec.id}
      id={spec.id}
      icon={spec.icon}
      label={spec.label}
      current={tool}
      shortcut={spec.shortcut}
      tip={offReason ?? tipWithKey(spec.label, spec.keyId)}
      isDisabled={offReason !== null}
      pick={onTool}
    />
  );
};

const TopBarTools = ({
  tool,
  commentAvailable,
  vectorAvailable,
  onTool,
}: {
  readonly tool: CanvasTool;
  readonly commentAvailable: boolean;
  readonly vectorAvailable: boolean;
  readonly onTool: (next: ToolId) => void;
}): ReactElement => {
  const available = { commentAvailable, vectorAvailable };

  return (
    <fieldset
      ref={setToolsBar}
      className="ui-tools topbar-tools"
      aria-label={copy.canvasTools}
    >
      {DRAW_TOOLS.map((spec) => toToolButton(spec, tool, available, onTool))}
      <span className="topbar-tool-sep" aria-hidden="true" />
      {NOTE_TOOLS.map((spec) => toToolButton(spec, tool, available, onTool))}
    </fieldset>
  );
};

export { TopBarTools };
