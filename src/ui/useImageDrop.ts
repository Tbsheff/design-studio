import { useRef, type MutableRefObject } from 'react';
import type { BridgeToParent, ProjectKind } from '../shared/contracts';
import { imageKindOf, type SetImageRequest } from '../shared/image';
import { useBridge, type BridgeFrame } from './bridge';
import { NO_SOURCE } from './structureEdits';

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  enabled: boolean;
  frames: { slots: { token: string; src: string }[]; frontToken: string | null; elements: MutableRefObject<Record<string, HTMLIFrameElement | null>> };
  notify: (message: string) => void;
}

type FileDrop = Extract<BridgeToParent, { type: 'file-drop' }>;

async function place(o: Options, directionId: string, drop: FileDrop, file: File): Promise<void> {
  const selection = drop.selection;
  if (!selection) return;
  const { fileData, imageApi, imageError, imageTargetOf } = await import('./imageApi');
  try {
    const image = await fileData(file);
    const kind = imageKindOf(selection);
    const request: SetImageRequest = { target: imageTargetOf(selection), image, ...(kind ? {} : { mode: 'insert' as const, position: drop.inside ? ('inside' as const) : ('after' as const), alt: '' }) };
    const result = await imageApi.set(o.projectId, directionId, request);
    o.notify(`${result.title}.`);
  } catch (error) {
    o.notify(imageError(error));
  }
}

function refusal(o: Options, drop: FileDrop): string | null {
  if (!drop.files[0]) return 'Drop an image file: PNG, JPEG, WebP, AVIF, GIF or SVG.';
  if (!o.enabled || !o.directionId) return 'Edits are paused here. Wait for the run to finish, or open the latest version.';
  if (!drop.selection) return 'Drop the image on an element in the frame.';
  if (!drop.selection.source && !drop.selection.owners?.length) return NO_SOURCE;
  return null;
}

export function useImageDrop(o: Options): void {
  const live = useRef(o);
  live.current = o;
  const busy = useRef(false);
  useBridge(
    () => live.current.frames.slots.map((slot): BridgeFrame => ({ key: slot.token, token: slot.token, url: slot.src, kind: live.current.kind, element: live.current.frames.elements.current[slot.token] ?? null })),
    (frame, msg: BridgeToParent) => {
      if (msg.type !== 'file-drop' || frame.token !== live.current.frames.frontToken) return;
      const cur = live.current;
      const problem = refusal(cur, msg);
      if (problem) return cur.notify(problem);
      if (busy.current) return;
      busy.current = true;
      void place(cur, cur.directionId as string, msg, msg.files[0] as File).finally(() => {
        busy.current = false;
      });
    },
  );
}
