import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { SHARE_LIVE_VIEWERS_MAX, type ShareFrame, type SharePresenceCursor, type SharePresenceEvent, type StudioCursorInput } from '../../shared/share.js';
import { resolveSource, type ExportDeps } from '../export/source.js';
import { captureShare } from './snapshot.js';
import { isLive, type ShareRecord, type ShareStore } from './store.js';

const CURSOR_MIN_MS = 40;
const STUDIO_CURSOR_MIN_MS = 30;
const POLL_MS = 150;

type Send = (event: string, data: unknown) => void;

interface Viewer {
  key: string;
  id: string;
  name: string;
  send: Send;
  close: () => Promise<void>;
  at: number;
  cursor: { frame: number; x: number; y: number } | null;
}

interface Room {
  linkId: string;
  projectId: string;
  frames: ShareFrame[];
  studioCursor: boolean;
  viewers: Map<string, Viewer>;
}

export interface ViewerCursorInput {
  key: string;
  name: string;
  frame: number | null;
  x: number;
  y: number;
}

export interface LiveHub {
  join(record: ShareRecord, send: Send, close: () => Promise<void>): { key: string; id: string } | null;
  leave(linkId: string, key: string): void;
  cursor(linkId: string, input: ViewerCursorInput): 'ok' | 'gone' | 'skip';
  subscribeStudio(projectId: string, send: (event: SharePresenceEvent) => void): () => void;
  studioCursor(projectId: string, input: StudioCursorInput | null): void;
  update(record: ShareRecord): void;
  setStudioCursor(record: ShareRecord): void;
  close(linkId: string): Promise<void>;
  count(linkId: string): number;
  hasRoom(linkId: string): boolean;
}

function publicCursor(room: Room, viewer: Viewer): SharePresenceCursor | null {
  if (!viewer.cursor) return null;
  const frame = room.frames[viewer.cursor.frame];
  return { linkId: room.linkId, viewer: viewer.id, name: viewer.name, frameId: frame?.id ?? null, frame: viewer.cursor.frame, x: viewer.cursor.x, y: viewer.cursor.y };
}

export function createLiveHub(): LiveHub {
  const rooms = new Map<string, Room>();
  const studio = new Map<string, Set<(event: SharePresenceEvent) => void>>();
  const studioAt = new Map<string, number>();

  const toStudio = (projectId: string, event: SharePresenceEvent): void => {
    for (const send of studio.get(projectId) ?? []) send(event);
  };

  const stateOf = (projectId: string): SharePresenceEvent => {
    const own = [...rooms.values()].filter((r) => r.projectId === projectId);
    const cursors = own.flatMap((room) => [...room.viewers.values()].map((v) => publicCursor(room, v)).filter((c): c is SharePresenceCursor => c !== null));
    return { type: 'state', cursors, wantCursor: own.some((r) => r.studioCursor && r.viewers.size > 0), live: own.length };
  };

  const roomOf = (record: ShareRecord): Room => {
    const found = rooms.get(record.id);
    if (found) return found;
    const room: Room = { linkId: record.id, projectId: record.projectId, frames: record.frames, studioCursor: record.studioCursor === true, viewers: new Map() };
    rooms.set(record.id, room);
    return room;
  };

  const leave = (linkId: string, key: string): void => {
    const room = rooms.get(linkId);
    const viewer = room?.viewers.get(key);
    if (!room || !viewer) return;
    room.viewers.delete(key);
    if (room.viewers.size === 0) rooms.delete(linkId);
    toStudio(room.projectId, { type: 'leave', linkId, viewer: viewer.id });
    toStudio(room.projectId, stateOf(room.projectId));
  };

  return {
    join(record, send, close) {
      const room = roomOf(record);
      if (room.viewers.size >= SHARE_LIVE_VIEWERS_MAX) return null;
      const viewer: Viewer = { key: randomBytes(18).toString('base64url'), id: randomBytes(6).toString('base64url'), name: 'Viewer', send, close, at: 0, cursor: null };
      room.viewers.set(viewer.key, viewer);
      toStudio(room.projectId, stateOf(room.projectId));
      return { key: viewer.key, id: viewer.id };
    },
    leave,
    cursor(linkId, input) {
      const room = rooms.get(linkId);
      const viewer = room?.viewers.get(input.key);
      if (!room || !viewer) return 'gone';
      const now = Date.now();
      if (now - viewer.at < CURSOR_MIN_MS) return 'skip';
      viewer.at = now;
      viewer.name = input.name;
      if (input.frame === null || !room.frames[input.frame]) {
        if (!viewer.cursor) return 'ok';
        viewer.cursor = null;
        toStudio(room.projectId, { type: 'leave', linkId, viewer: viewer.id });
        return 'ok';
      }
      viewer.cursor = { frame: input.frame, x: input.x, y: input.y };
      const shown = publicCursor(room, viewer);
      if (shown) toStudio(room.projectId, { type: 'cursor', cursor: shown });
      return 'ok';
    },
    subscribeStudio(projectId, send) {
      const set = studio.get(projectId) ?? new Set();
      set.add(send);
      studio.set(projectId, set);
      send(stateOf(projectId));
      return () => {
        set.delete(send);
        if (set.size === 0) studio.delete(projectId);
      };
    },
    studioCursor(projectId, input) {
      const now = Date.now();
      if (input && now - (studioAt.get(projectId) ?? 0) < STUDIO_CURSOR_MIN_MS) return;
      studioAt.set(projectId, now);
      for (const room of rooms.values()) {
        if (room.projectId !== projectId || !room.studioCursor) continue;
        const frame = !input?.frameId ? -1 : room.frames.length === 1 && !room.frames[0]?.id ? 0 : room.frames.findIndex((f) => f.id === input.frameId);
        const data = frame >= 0 && input ? { frame, x: Math.round(input.x), y: Math.round(input.y) } : null;
        for (const viewer of room.viewers.values()) viewer.send('studio', data);
      }
    },
    update(record) {
      const room = rooms.get(record.id);
      if (!room) return;
      room.frames = record.frames;
      const frames = record.frames.map((f) => ({ name: f.name, width: f.width, height: f.height, cssHeight: f.cssHeight, ...(f.path ? { path: f.path } : {}) }));
      for (const viewer of room.viewers.values()) viewer.send('frames', { rev: record.rev ?? 0, frames });
    },
    setStudioCursor(record) {
      const room = rooms.get(record.id);
      if (!room) return;
      room.studioCursor = record.studioCursor === true;
      if (!room.studioCursor) for (const viewer of room.viewers.values()) viewer.send('studio', null);
      toStudio(room.projectId, stateOf(room.projectId));
    },
    async close(linkId) {
      const room = rooms.get(linkId);
      if (!room) return;
      rooms.delete(linkId);
      const closing = [...room.viewers.values()].map((viewer) => {
        viewer.send('end', {});
        return viewer.close();
      });
      toStudio(room.projectId, stateOf(room.projectId));
      await Promise.race([Promise.all(closing), new Promise((resolve) => setTimeout(resolve, 500).unref())]);
      if (closing.length > 0) await new Promise((resolve) => setTimeout(resolve, 50).unref());
    },
    count: (linkId) => rooms.get(linkId)?.viewers.size ?? 0,
    hasRoom: (linkId) => rooms.has(linkId),
  };
}

export interface LiveRefresher {
  kick(): void;
  stop(): void;
}

export function createLiveRefresher(deps: ExportDeps, store: ShareStore, hub: LiveHub, onEnded: () => void): LiveRefresher {
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;
  const busy = new Set<string>();
  const failed = new Map<string, string>();

  const refresh = async (record: ShareRecord, head: string): Promise<void> => {
    busy.add(record.id);
    const dir = store.framesDir(record.id);
    try {
      const source = await resolveSource(deps, record.projectId, head);
      const frames = record.frames.map((f) => ({ name: f.name, width: f.width, height: f.height, ...(f.path ? { path: f.path } : {}) }));
      const shots = await captureShare(deps.preview, source, frames, dir, record.frames.map((f) => f.id));
      const next = await store.update(record.id, { versionId: source.version.id, frames: shots, rev: (record.rev ?? 0) + 1 });
      if (next) hub.update(next);
      else await rm(dir, { recursive: true, force: true });
    } catch (error) {
      failed.set(record.id, head);
      console.error('[share] live refresh failed', error);
    } finally {
      busy.delete(record.id);
    }
  };

  const check = async (record: ShareRecord): Promise<void> => {
    if (busy.has(record.id)) return;
    const project = await deps.projects.get(record.projectId).catch(() => null);
    const head = project?.directions.find((d) => d.id === record.directionId)?.headVersionId;
    if (head && head !== record.versionId && failed.get(record.id) !== head) await refresh(record, head);
  };

  const tick = async (): Promise<void> => {
    timer = null;
    const records = await store.list().catch(() => []);
    const now = Date.now();
    let ended = false;
    for (const record of records) {
      if (!isLive(record, now) && hub.hasRoom(record.id)) {
        await hub.close(record.id);
        ended = true;
      }
    }
    if (ended) onEnded();
    const live = records.filter((r) => r.live === true && isLive(r, now));
    for (const record of live) void check(record);
    if (live.length > 0 && !stopped) {
      timer = setTimeout(() => void tick(), POLL_MS);
      timer.unref();
    }
  };

  return {
    kick() {
      if (timer || stopped) return;
      timer = setTimeout(() => void tick(), 0);
      timer.unref();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
