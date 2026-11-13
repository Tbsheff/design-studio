import { startFrameOf, withImplicit } from "@design-studio/contracts/links";
import type { LinksFile } from "@design-studio/contracts/links";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { LinkedDragEnd } from "./linked-frame-model.js";
import { linksApi, useImplicitLinks, useLinks } from "./links-api.js";
import { playStartOf, toLinkSource } from "./prototype-model.js";
import type { PrototypeOptions } from "./prototype-options-model.js";
import { runOrReport } from "./settle-model.js";
import { useLinkDrag } from "./use-link-drag.js";

interface PrototypeFile {
  readonly file: LinksFile;
  readonly startId: string;
}

interface ViewToggle {
  readonly on: boolean;
  readonly onToggle: () => void;
}

interface PrototypeView {
  readonly arrows: boolean;
  readonly playing: boolean;
  readonly play: () => void;
  readonly onClosePlay: () => void;
  readonly viewToggle: ViewToggle | undefined;
}

const useClearOnFrameChange = (
  activeId: string,
  isOn: boolean,
  clearSelection: () => void
): void => {
  const clear = useRef(clearSelection);
  useLayoutEffect(() => {
    clear.current = clearSelection;
  });
  const lastActive = useRef(activeId);

  useEffect(() => {
    if (lastActive.current === activeId) {
      return;
    }

    lastActive.current = activeId;

    if (isOn) {
      clear.current();
    }
  }, [activeId, isOn]);
};

const usePrototypeFile = (options: PrototypeOptions): PrototypeFile => {
  const { frames } = options;
  const saved = useLinks(options.projectId);

  const implicit = useImplicitLinks(
    options.projectId,
    frames.map((frame) => `${frame.id}:${frame.path ?? ""}`).join(",")
  );

  const file = withImplicit(saved, implicit);
  const startId = playStartOf(file, frames, startFrameOf(file, frames));
  useClearOnFrameChange(options.active.id, options.on, options.clearSelection);

  return { file, startId };
};

const toViewToggle = (
  isOn: boolean,
  arrows: boolean,
  onToggle: () => void
): ViewToggle | undefined => {
  if (isOn) {
    return { on: arrows, onToggle };
  }
};

const usePrototypeView = (isOn: boolean): PrototypeView => {
  const [arrows, setArrows] = useState(true);
  const [playing, setPlaying] = useState(false);
  const play = useCallback((): void => setPlaying(true), []);
  const onClosePlay = useCallback((): void => setPlaying(false), []);
  const onToggle = useCallback((): void => setArrows((value) => !value), []);

  const viewToggle = toViewToggle(isOn, arrows, onToggle);

  return { arrows, onClosePlay, play, playing, viewToggle };
};

const usePrototypeDrag = (
  options: PrototypeOptions,
  onEmptyDrop: (end: LinkedDragEnd) => void
): ReturnType<typeof useLinkDrag> =>
  useLinkDrag((selection, frameId) => {
    void runOrReport(
      linksApi.add(options.projectId, {
        from: toLinkSource(selection, options.active),
        to: { frame: frameId },
        transition: "instant",
      }),
      (problem) => options.notify(problem.message)
    );
  }, onEmptyDrop);

export { usePrototypeDrag, usePrototypeFile, usePrototypeView };

export type { PrototypeFile, PrototypeView, ViewToggle };
