import { lazy, Suspense, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import type { ProjectKind, SelectionContext } from '../shared/contracts';
import { isBackTarget, startFrameOf, type PrototypeLink } from '../shared/links';
import { api } from './api';
import { frameDirection, frameName, withFramePath, type CanvasFrame } from './canvasFrames';
import { frameStateOf, useCurrentFrameStates } from './frameStates';
import { withFrameStateHost } from '../shared/frame-state';
import { linksApi, useLinks } from './linksApi';
import { useLinkRects } from './useLinkRects';
import { LinkArrows, LinkDragLine, LinkHandle, linkOfSelection, linkSourceOf, PrototypeBar, useLinkDrag } from './components/PrototypeLayer';

const PlayMode = lazy(() => import('./components/PlayMode'));

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
  preview: { frontToken: string | null; slots: { token: string; src: string }[]; elements: MutableRefObject<Record<string, HTMLIFrameElement | null>> };
  passive: { slots: { id: string; token: string; src: string | null }[]; elements: MutableRefObject<Record<string, HTMLIFrameElement | null>> };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function usePrototype(o: Options) {
  const on = o.on;
  const [arrows, setArrows] = useState(true);
  const [playing, setPlaying] = useState(false);
  const file = useLinks(o.projectId);
  const clear = useRef(o.clearSelection);
  clear.current = o.clearSelection;
  const lastActive = useRef(o.active.id);
  useEffect(() => {
    if (lastActive.current === o.active.id) return;
    lastActive.current = o.active.id;
    if (on) clear.current();
  }, [o.active.id, on]);
  const startId = startFrameOf(file, o.frames);
  const states = useLinkRects({
    kind: o.kind,
    file,
    frames: o.frames,
    enabled: on,
    active: { frameId: o.active.id, token: o.preview.frontToken, src: o.preview.slots.find((slot) => slot.token === o.preview.frontToken)?.src ?? null, elements: o.preview.elements },
    passive: o.passive,
  });
  const drag = useLinkDrag((selection, frameId) => {
    void linksApi.add(o.projectId, { from: linkSourceOf(selection, o.active), to: { frame: frameId }, transition: 'instant' }).catch((error: unknown) => o.notify(errorMessage(error)));
  });
  const frameTitle = (frame: CanvasFrame) => frame.label ?? frame.path ?? frameName(frame);
  const titleById = (id: string) => {
    const frame = o.frames.find((item) => item.id === id);
    return frame ? frameTitle(frame) : 'missing frame';
  };
  const linkTitle = (link: PrototypeLink) => `${link.from.text ? `“${link.from.text}”` : link.from.selector} in ${titleById(link.from.frame)} → ${isBackTarget(link.to) ? 'Back' : titleById(link.to.frame)}`;
  const urls = useRef(new Map<string, Promise<string>>());
  const frameStates = useCurrentFrameStates();
  const withState = (frame: CanvasFrame, url: string): string => (frameStates ? withFrameStateHost(url, frameStateOf(frameStates.view, frame.id)) : url);
  const urlOf = (frame: CanvasFrame): Promise<string | null> => baseUrlOf(frame).then((url) => (url ? withState(frame, url) : null));
  const baseUrlOf = (frame: CanvasFrame): Promise<string | null> => {
    const did = frameDirection(frame, o.directionId);
    if (!did) return Promise.resolve(null);
    if (did === o.directionId && o.baseUrl) return Promise.resolve(withFramePath(o.baseUrl, frame.path));
    let url = urls.current.get(did);
    if (!url) {
      url = api.directionPreview(o.projectId, did).then((result) => result.url);
      urls.current.set(did, url);
      url.catch(() => urls.current.delete(did));
    }
    return url.then((base) => withFramePath(base, frame.path)).catch(() => null);
  };
  const play = () => setPlaying(true);
  const single = o.selection.length === 1 ? o.selection[0] : undefined;
  const selected = on ? linkOfSelection(states, single, o.active.id) : null;
  const artboard: ReactNode = on ? (
    <>
      <LinkArrows states={states} frames={o.shown} active={o.active} startId={startId} arrows={arrows} selectedId={selected?.link.id ?? null} dropTarget={drag.drag?.target ?? null} />
      {single && o.live && <LinkHandle selection={single} activeId={o.active.id} onBegin={drag.begin} />}
    </>
  ) : null;
  const stage: ReactNode = (
    <>
      {on && (
        <PrototypeBar
          projectId={o.projectId}
          file={file}
          states={states}
          frames={o.shown}
          startId={startId}
          selected={selected}
          hasSelection={single !== undefined}
          frameTitle={frameTitle}
          linkTitle={linkTitle}
          onError={o.notify}
        />
      )}
      <LinkDragLine drag={drag.drag} />
      {playing && (
        <Suspense fallback={null}>
          <PlayMode kind={o.kind} file={file} frames={o.frames} startId={startId} sandbox={o.sandbox} urlOf={urlOf} frameTitle={frameTitle} onClose={() => setPlaying(false)} />
        </Suspense>
      )}
    </>
  );
  return { play, artboard, stage, viewToggle: on ? { on: arrows, onToggle: () => setArrows((v) => !v) } : undefined };
}
