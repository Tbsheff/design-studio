import { useEffect, useRef, type RefObject } from 'react';
import { BRIDGE_TOKEN_PARAM, type BridgeToParent, type ProjectKind } from '../shared/contracts';
import { lofiCss } from '../shared/lofi';
import { postToFrame, useBridge, type BridgeFrame } from './bridge';

let cssLoad: Promise<string> | null = null;

function toBase64(bytes: Uint8Array): string {
  let text = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) text += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(text);
}

function loadLofiCss(): Promise<string> {
  cssLoad ??= fetch(new URL('./assets/fonts/kalam-latin-400-normal.woff2', import.meta.url).href)
    .then((res) => {
      if (!res.ok) throw new Error(`font ${res.status}`);
      return res.arrayBuffer();
    })
    .then((buffer) => lofiCss(`data:font/woff2;base64,${toBase64(new Uint8Array(buffer))}`))
    .catch((error: unknown) => {
      cssLoad = null;
      console.error('[lofi] font load failed', error);
      return lofiCss('data:font/woff2;base64,');
    });
  return cssLoad;
}

interface LofiFrame extends BridgeFrame {
  directionId: string | null;
}

function tokenOf(src: string): string | null {
  try {
    return new URL(src, window.location.href).searchParams.get(BRIDGE_TOKEN_PARAM);
  } catch {
    return null;
  }
}

function stageFrames(stage: HTMLElement | null, kind: ProjectKind, currentId: string | null): LofiFrame[] {
  if (!stage) return [];
  const out: LofiFrame[] = [];
  for (const element of stage.querySelectorAll<HTMLIFrameElement>('iframe.frame')) {
    const token = tokenOf(element.src);
    if (!token) continue;
    const host = element.closest<HTMLElement>('[data-direction-id], .artboard');
    const directionId = host?.dataset.directionId ?? currentId;
    out.push({ key: token, token, url: element.src, kind, element, directionId });
  }
  return out;
}

export function useLofiFrames(stageRef: RefObject<HTMLElement | null>, kind: ProjectKind, currentId: string | null, lofi: readonly string[]): void {
  const sent = useRef(new WeakMap<HTMLIFrameElement, boolean>());
  const latest = useRef({ kind, currentId, lofi });
  latest.current = { kind, currentId, lofi };
  const frames = () => stageFrames(stageRef.current, latest.current.kind, latest.current.currentId);
  const wants = (frame: LofiFrame) => frame.directionId !== null && latest.current.lofi.includes(frame.directionId);

  const sync = (frame: LofiFrame, force: boolean) => {
    const element = frame.element;
    if (!element) return;
    const on = wants(frame);
    if (!force && (sent.current.get(element) ?? false) === on) return;
    sent.current.set(element, on);
    if (!on) {
      postToFrame(frame, { type: 'lofi-preview', css: '' });
      return;
    }
    void loadLofiCss().then((css) => {
      if (sent.current.get(element) === true && wants(frame)) postToFrame(frame, { type: 'lofi-preview', css });
    });
  };

  useBridge(frames, (frame: BridgeFrame, message: BridgeToParent) => {
    if (message.type !== 'ready') return;
    const found = frames().find((item) => item.element === frame.element);
    if (found) sync(found, true);
  });

  const key = lofi.join(',');
  useEffect(() => {
    for (const frame of frames()) sync(frame, false);
  });
  useEffect(() => {
    if (key) void loadLofiCss();
  }, [key]);
}
