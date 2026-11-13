import type { SelectionContext } from "@design-studio/contracts";
import type { LinksFile, PrototypeLink } from "@design-studio/contracts/links";
import { useCallback, useState } from "react";
import type { PointerEvent, ReactElement } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import { frameTitle } from "./frame-label-model.js";
import { LinkEditor } from "./link-editor.js";
import { pickEditing } from "./link-view.js";
import { PrototypeBarLinks } from "./prototype-bar-links.js";
import { toProtoHint } from "./prototype-model.js";
import { PrototypeStartSelect } from "./prototype-start-select.js";
import { StartPointsMenu } from "./start-points-menu.js";
import type { LinkState } from "./use-link-rects.js";

interface BarProps {
  readonly projectId: string;
  readonly file: LinksFile;
  readonly states: LinkState[];
  readonly frames: CanvasFrame[];
  readonly startId: string;
  readonly activeId: string | null;
  readonly selected: LinkState | null;
  readonly hasSelection: boolean;
  readonly selection: SelectionContext | null;
  readonly linkTitle: (link: PrototypeLink) => string;
  readonly onError: (message: string) => void;
}

const toStartNodes = (
  bar: BarProps,
  toTitle: (frame: CanvasFrame) => string
): ReactElement => {
  const { onError } = bar;

  return (
    <>
      <PrototypeStartSelect
        projectId={bar.projectId}
        file={bar.file}
        frames={bar.frames}
        startId={bar.startId}
        toTitle={toTitle}
        onError={onError}
      />
      <StartPointsMenu
        projectId={bar.projectId}
        file={bar.file}
        frames={bar.frames}
        activeId={bar.activeId}
        toTitle={toTitle}
        onError={onError}
      />
    </>
  );
};

const PrototypeBar = (bar: BarProps): ReactElement => {
  const { projectId, file, states, frames, selected, onError } = bar;
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const toTitle = useCallback(
    (frame: CanvasFrame): string => frameTitle(frame, frames),
    [frames]
  );

  const editing = pickEditing(states, pinnedId, selected);
  const editingId = editing?.link.id ?? null;

  const handlePicking = useCallback(
    (isPicking: boolean): void => {
      if (isPicking) {
        setPinnedId(editingId);

        return;
      }

      setPinnedId(null);
    },
    [editingId]
  );

  const handleBarPointerDown = useCallback(
    (event: PointerEvent): void => event.stopPropagation(),
    []
  );

  const hint = toProtoHint(frames, bar.hasSelection);

  return (
    <div
      className="proto-bar"
      role="toolbar"
      aria-label={copy.prototype}
      data-testid="proto-bar"
      onPointerDown={handleBarPointerDown}
    >
      {toStartNodes(bar, toTitle)}
      <div className="toolbar-sep" />
      {editing && (
        <LinkEditor
          projectId={projectId}
          state={editing}
          frames={frames}
          toTitle={toTitle}
          picked={bar.selection?.selector ?? null}
          onPicking={handlePicking}
          onError={onError}
        />
      )}
      {!editing && (
        <span className="proto-hint truncate" data-tip={hint}>
          {hint}
        </span>
      )}
      <div className="toolbar-sep" />
      <PrototypeBarLinks
        projectId={projectId}
        file={file}
        states={states}
        toLinkTitle={bar.linkTitle}
        onError={onError}
      />
    </div>
  );
};

export { PrototypeBar };
