import { useEffect, useRef } from 'react';
import {
  BRIDGE_PARENT_ORIGIN_PARAM,
  BRIDGE_TOKEN_PARAM,
  type BridgeToParent,
  type ParentToBridge,
  type ProjectKind,
} from '../shared/contracts';

export interface BridgeFrame {
  key: string;
  token: string;
  url: string;
  kind: ProjectKind;
  element: HTMLIFrameElement | null;
}

export const HTML_FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms';

export type ParentMessageBody = ParentToBridge extends infer M ? (M extends ParentToBridge ? Omit<M, 'ns' | 'token'> : never) : never;

export interface PreviewPort {
  post: (body: ParentMessageBody) => void;
  refreshRects: () => void;
}

function urlOrigin(url: string): string {
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return '';
  }
}

function frameOrigin(frame: Pick<BridgeFrame, 'url'>): string {
  return urlOrigin(frame.url);
}

export function frameSrc(previewUrl: string, token: string, extra?: Record<string, string>): string {
  const url = new URL(previewUrl, window.location.href);
  url.searchParams.set(BRIDGE_TOKEN_PARAM, token);
  url.searchParams.set(BRIDGE_PARENT_ORIGIN_PARAM, window.location.origin);
  if (extra) for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return url.toString();
}

export function postToFrame(frame: BridgeFrame, body: ParentMessageBody): void {
  const win = frame.element?.contentWindow;
  if (!win) return;
  const target = frameOrigin(frame);
  if (target === '') return;
  const message = { ns: 'studio', token: frame.token, ...body } as ParentToBridge;
  win.postMessage(message, target);
}

function isBridgeMessage(data: unknown): data is BridgeToParent {
  if (!data || typeof data !== 'object') return false;
  const m = data as { ns?: unknown; token?: unknown; type?: unknown };
  return m.ns === 'studio' && typeof m.token === 'string' && typeof m.type === 'string';
}

export function useBridge(
  getFrames: () => BridgeFrame[],
  onMessage: (frame: BridgeFrame, message: BridgeToParent) => void,
): void {
  const framesRef = useRef(getFrames);
  framesRef.current = getFrames;
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!isBridgeMessage(event.data)) return;
      const frame = framesRef.current().find((f) => f.element !== null && event.source === f.element.contentWindow);
      if (!frame) return;
      if (event.origin !== frameOrigin(frame)) return;
      if (event.data.token !== frame.token) return;
      handlerRef.current(frame, event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);
}
