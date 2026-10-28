import { useEffect, useSyncExternalStore, type MutableRefObject } from 'react';
import type { BridgeToParent, ProjectKind } from '../shared/contracts';
import { postToFrame, useBridge, type BridgeFrame, type ParentMessageBody } from './bridge';

export type ThemeChoice = 'light' | 'dark' | null;

interface FrameSlot {
  token: string;
  src: string;
}

type FrameSource = () => BridgeFrame;

const sources = new Map<string, FrameSource>();
const liveTokens = new Set<string>();
const HOLD_FALLBACK_MS = 4000;
interface HoldState {
  timer: number | null;
  expired: boolean;
  fresh: Set<string>;
  painted: Set<string>;
}

type CssMessage = 'tokens-preview' | 'tweaks-preview';

interface CssChannel {
  type: CssMessage;
  css: string;
  hold: HoldState;
}

function createChannel(type: CssMessage): CssChannel {
  return { type, css: '', hold: { timer: null, expired: false, fresh: new Set(), painted: new Set() } };
}

const tokenChannel = createChannel('tokens-preview');
const tweakChannel = createChannel('tweaks-preview');
const channels = [tokenChannel, tweakChannel];
const current: { theme: ThemeChoice } = { theme: null };
const canvas: { front: string | null; swapping: boolean } = { front: null, swapping: false };

function holding(channel: CssChannel): boolean {
  return channel.hold.timer !== null || channel.hold.expired;
}

function endHold(channel: CssChannel): void {
  const hold = channel.hold;
  if (hold.timer !== null) window.clearTimeout(hold.timer);
  hold.timer = null;
  hold.expired = false;
  hold.fresh.clear();
  hold.painted.clear();
}

function releaseHold(channel: CssChannel): void {
  if (!holding(channel)) return;
  const front = canvas.front;
  const freshFront = front !== null && channel.hold.painted.has(front);
  if (freshFront || (channel.hold.expired && !canvas.swapping)) broadcastCss(channel, '');
}

function expireHold(channel: CssChannel): void {
  channel.hold.timer = null;
  channel.hold.expired = true;
  releaseHold(channel);
}

function registerTokenFrame(token: string, source: FrameSource, live: boolean): () => void {
  sources.set(token, source);
  if (live) liveTokens.add(token);
  else liveTokens.delete(token);
  return () => {
    if (sources.get(token) !== source) return;
    sources.delete(token);
    liveTokens.delete(token);
  };
}

export function postToLiveFrames(body: ParentMessageBody): void {
  for (const token of liveTokens) {
    const frame = sources.get(token)?.();
    if (frame?.element) postToFrame(frame, body);
  }
}

function tokenFrames(): BridgeFrame[] {
  return [...sources.values()].map((source) => source()).filter((frame) => frame.element !== null);
}

function broadcastCss(channel: CssChannel, css: string): void {
  endHold(channel);
  if (css === channel.css) return;
  channel.css = css;
  for (const frame of tokenFrames()) postToFrame(frame, { type: channel.type, css });
}

function holdUntilReload(channel: CssChannel): void {
  endHold(channel);
  if (channel.css === '') return;
  channel.hold.timer = window.setTimeout(() => expireHold(channel), HOLD_FALLBACK_MS);
}

export function broadcastTokenCss(css: string): void {
  broadcastCss(tokenChannel, css);
}

export function broadcastTweakCss(css: string): void {
  broadcastCss(tweakChannel, css);
}

export function holdTokenCssUntilReload(): void {
  holdUntilReload(tokenChannel);
}

export function holdTweakCssUntilReload(): void {
  holdUntilReload(tweakChannel);
}

const themeListeners = new Set<() => void>();

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

export function broadcastTheme(theme: ThemeChoice): void {
  const changed = current.theme !== theme;
  current.theme = theme;
  for (const frame of tokenFrames()) postToFrame(frame, { type: 'set-theme', theme });
  if (changed) for (const listener of themeListeners) listener();
}

export function useCanvasTheme(): ThemeChoice {
  return useSyncExternalStore(subscribeTheme, () => current.theme);
}

function syncTokenFrame(frame: BridgeFrame): void {
  for (const channel of channels) {
    if (holding(channel)) channel.hold.fresh.add(frame.token);
    else if (channel.css !== '') postToFrame(frame, { type: channel.type, css: channel.css });
  }
  if (current.theme !== null) postToFrame(frame, { type: 'set-theme', theme: current.theme });
}

function onTokenFrameMessage(frame: BridgeFrame, message: BridgeToParent): void {
  if (message.type === 'ready') {
    syncTokenFrame(frame);
    return;
  }
  if (message.type !== 'painted') return;
  for (const channel of channels) {
    if (!channel.hold.fresh.has(frame.token)) continue;
    channel.hold.painted.add(frame.token);
    releaseHold(channel);
  }
}

export function setCanvasFront(front: string | null, swapping: boolean): void {
  canvas.front = front;
  canvas.swapping = swapping;
  for (const channel of channels) releaseHold(channel);
}

export function useTokenFrameSync(): void {
  useBridge(tokenFrames, onTokenFrameMessage);
  useEffect(
    () => () => {
      for (const channel of channels) {
        endHold(channel);
        channel.css = '';
      }
      broadcastTheme(null);
    },
    [],
  );
}

export function useTokenFrames(slots: FrameSlot[], elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>, kind: ProjectKind, live = false): void {
  useEffect(() => {
    const offs = slots.map((slot) =>
      registerTokenFrame(slot.token, () => ({ key: slot.token, token: slot.token, url: slot.src, kind, element: elements.current[slot.token] ?? null }), live),
    );
    return () => offs.forEach((off) => off());
  }, [slots, elements, kind, live]);
}
