import type { SelectionContext } from "@design-studio/contracts";
import type { PrototypeLink } from "@design-studio/contracts/links";
import { Suspense, useCallback } from "react";
import type { ReactNode } from "react";

import { ImageDropGhost } from "./image-drop-ghost.js";
import { PlayMode } from "./lazy-play-mode.js";
import { PrototypeBar } from "./lazy-prototype-bar.js";
import { LinkArrows } from "./link-arrows.js";
import { LinkDragLine } from "./link-drag-line.js";
import { LinkHandle } from "./link-handle.js";
import { linkOfSelection } from "./link-view.js";
import { LinkedFramePrompt } from "./linked-frame-prompt.js";
import { toLinkRectsInput } from "./prototype-links-input.js";
import type { PrototypeOptions } from "./prototype-options-model.js";
import { toFrameTitle, toLinkTitle } from "./prototype-titles-model.js";
import { useImagePaste } from "./use-image-paste.js";
import { useLinkRects } from "./use-link-rects.js";
import type { LinkState } from "./use-link-rects.js";
import { useLinkedFrame } from "./use-linked-frame.js";
import {
  usePrototypeDrag,
  usePrototypeFile,
  usePrototypeView,
} from "./use-prototype-state.js";
import type {
  PrototypeFile,
  PrototypeView,
  ViewToggle,
} from "./use-prototype-state.js";
import { usePrototypeUrls } from "./use-prototype-urls.js";

type LinkDragState = ReturnType<typeof usePrototypeDrag>;

interface PrototypeParts {
  readonly artboard: ReactNode;
  readonly play: () => void;
  readonly stage: ReactNode;
  readonly viewToggle: ViewToggle | undefined;
}

interface PrototypeScene {
  readonly linkTitle: (link: PrototypeLink) => string;
  readonly options: PrototypeOptions;
  readonly prototypeFile: PrototypeFile;
  readonly view: PrototypeView;
  readonly states: LinkState[];
  readonly drag: LinkDragState;
  readonly single: SelectionContext | null;
  readonly selected: LinkState | null;
}

const toSingleSelection = (
  selection: SelectionContext[]
): SelectionContext | null => {
  if (selection.length === 1) {
    return selection[0] ?? null;
  }

  return null;
};

const toSelectedLink = (
  scene: Pick<PrototypeScene, "options" | "states" | "single">
): LinkState | null => {
  if (scene.options.on) {
    return linkOfSelection(scene.states, scene.single, scene.options.active.id);
  }

  return null;
};

const toArtboardNode = (scene: PrototypeScene): ReactNode => {
  const { options, prototypeFile, view, states, drag, single, selected } =
    scene;

  const { begin: onBegin } = drag;

  if (!options.on) {
    return null;
  }

  return (
    <>
      <LinkArrows
        states={states}
        frames={options.shown}
        active={options.active}
        startId={prototypeFile.startId}
        arrows={view.arrows}
        selectedId={selected?.link.id ?? null}
        dropTarget={drag.drag?.target ?? null}
      />
      {single && options.live && (
        <LinkHandle
          selection={single}
          activeId={options.active.id}
          onBegin={onBegin}
        />
      )}
    </>
  );
};

const toBarNode = (scene: PrototypeScene): ReactNode => {
  const { options, prototypeFile, states, single, selected } = scene;
  const { linkTitle } = scene;
  const { notify: onError } = options;

  if (!options.on) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <PrototypeBar
        projectId={options.projectId}
        file={prototypeFile.file}
        states={states}
        frames={options.shown}
        startId={prototypeFile.startId}
        activeId={options.active.id}
        selected={selected}
        hasSelection={single !== null}
        selection={single}
        linkTitle={linkTitle}
        onError={onError}
      />
    </Suspense>
  );
};

const usePrototype = (options: PrototypeOptions): PrototypeParts => {
  const prototypeFile = usePrototypeFile(options);
  const view = usePrototypeView(options.on);
  const linked = useLinkedFrame(options);
  const imageDrop = useImagePaste(options);
  const drag = usePrototypeDrag(options, linked.onDrop);
  const urlOf = usePrototypeUrls(options);
  const states = useLinkRects(toLinkRectsInput(options, prototypeFile));
  const single = toSingleSelection(options.selection);
  const selected = toSelectedLink({ options, single, states });
  const { frames } = options;
  const { onClosePlay, play, viewToggle } = view;
  const { focusStage: onRestoreFocus } = options;

  const linkTitle = useCallback(
    (link: PrototypeLink): string => toLinkTitle(frames, link),
    [frames]
  );

  const scene = {
    drag,
    linkTitle,
    options,
    prototypeFile,
    selected,
    single,
    states,
    view,
  };

  const stage: ReactNode = (
    <>
      {toBarNode(scene)}
      <LinkDragLine drag={drag.drag} />
      <LinkedFramePrompt control={linked} />
      <ImageDropGhost control={imageDrop} />
      {view.playing && (
        <Suspense fallback={null}>
          <PlayMode
            kind={options.kind}
            projectId={options.projectId}
            file={prototypeFile.file}
            frames={options.frames}
            startId={prototypeFile.startId}
            sandbox={options.sandbox}
            urlOf={urlOf}
            frameTitle={toFrameTitle}
            onClose={onClosePlay}
            onRestoreFocus={onRestoreFocus}
            playComment={options.playComment}
            isFullBleed={false}
          />
        </Suspense>
      )}
    </>
  );

  const artboard = toArtboardNode(scene);

  return { artboard, play, stage, viewToggle };
};

export { usePrototype };
