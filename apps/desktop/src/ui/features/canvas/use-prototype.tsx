import type { ProjectKind, SelectionContext } from "@design-studio/contracts";
import { withFrameStateHost } from "@design-studio/contracts/frame-state";
import { targetFrame } from "@design-studio/contracts/link-interaction";
import {
  ACTION_LABELS,
  isBackTarget,
  linkAction,
  sourceName,
  startFrameOf,
  withImplicit,
} from "@design-studio/contracts/links";
import type { PrototypeLink } from "@design-studio/contracts/links";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";

import { api } from "../../api.js";
import {
  frameDirection,
  frameName,
  withFramePath,
} from "./canvas-frames-model.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { frameStateOf, useCurrentFrameStates } from "./frame-states-model.js";
import { linksApi, useImplicitLinks, useLinks } from "./links-api.js";
import {
  LinkArrows,
  LinkDragLine,
  LinkHandle,
  linkOfSelection,
  linkSourceOf,
  playStartOf,
  PrototypeBar,
  useLinkDrag,
} from "./prototype-layer.js";
import { runOrReport, toValueOr } from "./settle-model.js";
import { useLinkRects } from "./use-link-rects.js";

const PlayMode = lazy(() => import("./play-mode.js"));

interface Options {
  projectId: string;
  kind: ProjectKind;
  directionId: string | null;
  frames: CanvasFrame[];
  shown: CanvasFrame[];
  active: CanvasFrame;
  baseUrl: string | null;
  live: boolean;
  selection: SelectionContext[];
  clearSelection: () => void;
  sandbox?: string;
  notify: (message: string) => void;
  on: boolean;
  preview: {
    frontToken: string | null;
    slots: { token: string; src: string }[];
    elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  };
  passive: {
    slots: { id: string; token: string; src: string | null }[];
    elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  };
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const usePrototype = (options: Options) => {
  const { on } = options;
  const [arrows, setArrows] = useState(true);
  const [playing, setPlaying] = useState(false);
  const saved = useLinks(options.projectId);

  const implicit = useImplicitLinks(
    options.projectId,
    options.frames.map((frame) => `${frame.id}:${frame.path ?? ""}`).join(",")
  );

  const file = withImplicit(saved, implicit);
  const clear = useRef(options.clearSelection);
  clear.current = options.clearSelection;
  const lastActive = useRef(options.active.id);
  useEffect(() => {
    if (lastActive.current === options.active.id) {
      return;
    }

    lastActive.current = options.active.id;

    if (on) {
      clear.current();
    }
  }, [options.active.id, on]);
  const startId = playStartOf(
    file,
    options.frames,
    startFrameOf(file, options.frames)
  );

  const states = useLinkRects({
    active: {
      elements: options.preview.elements,
      frameId: options.active.id,
      src:
        options.preview.slots.find(
          (slot) => slot.token === options.preview.frontToken
        )?.src ?? null,
      token: options.preview.frontToken,
    },
    enabled: on,
    file,
    frames: options.frames,
    kind: options.kind,
    passive: options.passive,
  });

  const drag = useLinkDrag((selection, frameId) => {
    void runOrReport(
      linksApi.add(options.projectId, {
        from: linkSourceOf(selection, options.active),
        to: { frame: frameId },
        transition: "instant",
      }),
      (error) => options.notify(errorMessage(error))
    );
  });

  const frameTitle = (frame: CanvasFrame): string =>
    frame.label ?? frame.path ?? frameName(frame);

  const titleById = (id: string): string => {
    const frame = options.frames.find((item) => item.id === id);

    return frame ? frameTitle(frame) : "missing frame";
  };

  const targetName = (link: PrototypeLink): string => {
    if (isBackTarget(link.to)) {
      return "Back";
    }

    const to = targetFrame(link.to);

    return to ? titleById(to) : ACTION_LABELS[linkAction(link)];
  };

  const linkTitle = (link: PrototypeLink): string =>
    `${sourceName(link.from)} in ${titleById(link.from.frame)} → ${targetName(link)}`;

  const urls = useRef(new Map<string, Promise<string>>());
  const frameStates = useCurrentFrameStates();

  const withState = (frame: CanvasFrame, url: string): string =>
    frameStates
      ? withFrameStateHost(url, frameStateOf(frameStates.view, frame.id))
      : url;

  const urlOf = async (frame: CanvasFrame): Promise<string | null> => {
    const url = await baseUrlOf(frame);

    return url ? withState(frame, url) : null;
  };

  const fetchDirectionUrl = async (did: string): Promise<string> => {
    const result = await api.directionPreview(options.projectId, did);

    return result.url;
  };

  const baseUrlOf = async (frame: CanvasFrame): Promise<string | null> => {
    const did = frameDirection(frame, options.directionId);

    if (!did) {
      return null;
    }

    if (did === options.directionId && options.baseUrl) {
      return withFramePath(options.baseUrl, frame.path);
    }

    let url = urls.current.get(did);

    if (!url) {
      url = fetchDirectionUrl(did);
      urls.current.set(did, url);
      void runOrReport(url, () => urls.current.delete(did));
    }

    const base = await toValueOr(url, null);

    if (base === null) {
      return null;
    }

    return withFramePath(base, frame.path);
  };

  const play = (): void => setPlaying(true);
  const single =
    options.selection.length === 1 ? options.selection[0] : undefined;
  const selected = on
    ? linkOfSelection(states, single, options.active.id)
    : null;

  const artboard: ReactNode = on ? (
    <>
      <LinkArrows
        states={states}
        frames={options.shown}
        active={options.active}
        startId={startId}
        arrows={arrows}
        selectedId={selected?.link.id ?? null}
        dropTarget={drag.drag?.target ?? null}
      />
      {single && options.live && (
        <LinkHandle
          selection={single}
          activeId={options.active.id}
          onBegin={drag.begin}
        />
      )}
    </>
  ) : null;

  const stage: ReactNode = (
    <>
      {on && (
        <PrototypeBar
          projectId={options.projectId}
          file={file}
          states={states}
          frames={options.shown}
          startId={startId}
          selected={selected}
          hasSelection={single !== undefined}
          selection={single}
          frameTitle={frameTitle}
          linkTitle={linkTitle}
          onError={options.notify}
        />
      )}
      <LinkDragLine drag={drag.drag} />
      {playing && (
        <Suspense fallback={null}>
          <PlayMode
            kind={options.kind}
            file={file}
            frames={options.frames}
            startId={startId}
            sandbox={options.sandbox}
            urlOf={urlOf}
            frameTitle={frameTitle}
            onClose={() => setPlaying(false)}
          />
        </Suspense>
      )}
    </>
  );

  return {
    artboard,
    play,
    stage,
    viewToggle: on
      ? { on: arrows, onToggle: () => setArrows((value) => !value) }
      : undefined,
  };
};

export { usePrototype };
