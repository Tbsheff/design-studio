import type { SourceLoc } from "../../../shared/contracts.js";
import {
  onSourceChange,
  type SourceFileChange,
} from "../../events/source-change.js";
import { lineMapOf, type LineMap } from "../../page-probe/line-map.js";
import type { CommentStore } from "../../store/comments.js";
import type { LayerLockStore } from "../../store/layer-locks.js";

const LOCK_KEY = /^(.*?\|)(?:use:([^|]+)\|)?loc:(.+)(#\d+)$/;
const LOC = /^(.+):(\d+):(\d+)$/;

type Remap = (loc: SourceLoc) => SourceLoc | null;

interface Remapper {
  remap: Remap;
  removed: (loc: SourceLoc) => boolean;
}

function remapperOf(files: SourceFileChange[]): Remapper {
  const maps = new Map<string, LineMap>();

  const mapOf = (file: string): LineMap | null => {
    const change = files.find((item) => item.relative === file);

    if (!change) {
      return null;
    }

    let map = maps.get(file);

    if (!map) {
      map = lineMapOf(change.before, change.after);
      maps.set(file, map);
    }

    return map;
  };

  return {
    remap: (loc) => {
      const map = mapOf(loc.file);
      const line = map?.line(loc.line) ?? null;

      return map && line !== null
        ? { file: loc.file, line, col: map.col(loc.line, loc.col) }
        : null;
    },
    removed: (loc) => {
      const map = mapOf(loc.file);

      return map !== null && map.line(loc.line) === null;
    },
  };
}

function movedLoc(
  raw: string | undefined,
  moves: Remapper
): string | null | undefined {
  const match = raw === undefined ? null : LOC.exec(raw);

  if (!match) {
    return raw;
  }

  const loc = {
    file: match[1] ?? "",
    line: Number(match[2]),
    col: Number(match[3]),
  };

  if (moves.removed(loc)) {
    return null;
  }

  const next = moves.remap(loc);

  return next ? `${loc.file}:${next.line}:${next.col}` : raw;
}

function movedLockKey(key: string, moves: Remapper): string | null {
  const match = LOCK_KEY.exec(key);

  if (!match) {
    return key;
  }

  const [, page = "", use, own, nth = ""] = match;
  const nextUse = movedLoc(use, moves);
  const nextOwn = movedLoc(own, moves);

  if (nextUse === null || nextOwn === null) {
    return null;
  }

  return `${page}${nextUse === undefined ? "" : `use:${nextUse}|`}loc:${nextOwn}${nth}`;
}

async function followLocks(
  locks: LayerLockStore | null,
  change: { projectId: string; directionId: string },
  moves: Remapper
): Promise<void> {
  const { projectId, directionId } = change;

  if (!locks || (await locks.read(projectId, directionId)).keys.length === 0) {
    return;
  }

  await locks.update(projectId, directionId, (keys) =>
    keys
      .map((key) => movedLockKey(key, moves))
      .filter((key): key is string => key !== null)
  );
}

export function followSourceMoves(
  comments: CommentStore,
  locks: LayerLockStore | null
): () => void {
  return onSourceChange((change) => {
    const moves = remapperOf(change.files);
    void Promise.all([
      followLocks(locks, change, moves),
      comments.followSource(change.projectId, change.directionId, moves.remap),
    ]).catch((error: unknown) => {
      console.error("[follow-moves] could not move locks or comments", error);
    });
  });
}
