import type { SourceLoc } from '../../shared/contracts.js';
import { lineMapOf, type LineMap } from '../mcp/line-map.js';
import type { CommentStore } from '../store/comments.js';
import { configuredLayerLocks } from '../store/layer-locks.js';
import { onSourceChange, type SourceFileChange } from './change-feed.js';

const LOCK_LOC = /^(.*\|loc:)(.+):(\d+):(\d+)(#\d+)$/;

type Remap = (loc: SourceLoc) => SourceLoc | null;

function remapperOf(files: SourceFileChange[]): Remap {
  const maps = new Map<string, LineMap>();
  const mapOf = (file: string): LineMap | null => {
    const change = files.find((item) => item.relative === file);
    if (!change) return null;
    let map = maps.get(file);
    if (!map) {
      map = lineMapOf(change.before, change.after);
      maps.set(file, map);
    }
    return map;
  };
  return (loc) => {
    const map = mapOf(loc.file);
    const line = map?.line(loc.line) ?? null;
    return map && line !== null ? { file: loc.file, line, col: map.col(loc.line, loc.col) } : null;
  };
}

function movedLockKey(key: string, remap: Remap): string {
  const match = LOCK_LOC.exec(key);
  if (!match) return key;
  const [, head, file = '', line, col, nth] = match;
  const next = remap({ file, line: Number(line), col: Number(col) });
  return next ? `${head}${file}:${next.line}:${next.col}${nth}` : key;
}

async function followLocks(projectId: string, directionId: string, remap: Remap): Promise<void> {
  const locks = configuredLayerLocks();
  if (!locks || (await locks.read(projectId, directionId)).keys.length === 0) return;
  await locks.update(projectId, directionId, (keys) => keys.map((key) => movedLockKey(key, remap)));
}

export function followSourceMoves(comments: CommentStore): () => void {
  return onSourceChange((change) => {
    const remap = remapperOf(change.files);
    void Promise.all([followLocks(change.projectId, change.directionId, remap), comments.followSource(change.projectId, change.directionId, remap)]).catch((error: unknown) => {
      console.error('[follow-moves] could not move locks or comments', error);
    });
  });
}
