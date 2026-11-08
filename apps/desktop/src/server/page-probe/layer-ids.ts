import { layerRef } from "../../shared/layer-ref.js";
import type { SourceFileChange } from "../events/index.js";
import { lineMapOf } from "./line-map.js";
import type { LineMap } from "./line-map.js";

interface Ids {
  refByKey: Map<string, string>;
  keyByRef: Map<string, string>;
}

interface Move {
  ref: string;
  from: string;
  to: string | null;
}

const IDS_MAX = 50_000;
const GONE = "\u0000gone";
const LOC_IN_KEY = /(^|\|)([^|#]+):(\d+):(\d+)(?=[|#])/g;
const registries = new Map<string, Ids>();

const idsOf = (scope: string): Ids => {
  let ids = registries.get(scope);

  if (!ids || ids.refByKey.size > IDS_MAX) {
    ids = { keyByRef: new Map(), refByKey: new Map() };
    registries.set(scope, ids);
  }

  return ids;
};

const refForKey = (scope: string, key: string): string => {
  const ids = idsOf(scope);
  const known = ids.refByKey.get(key);

  if (known) {
    return known;
  }

  let ref = layerRef(key);

  for (
    let n = 1;
    ids.keyByRef.has(ref) && ids.keyByRef.get(ref) !== key;
    n += 1
  ) {
    ref = layerRef(`${key}^${n}`);
  }

  ids.refByKey.set(key, ref);
  ids.keyByRef.set(ref, key);

  return ref;
};

const isGoneRef = (scope: string, ref: string): boolean =>
  registries.get(scope)?.keyByRef.get(ref) === GONE;

const movedKey = (key: string, maps: Map<string, LineMap>): string | null => {
  let gone = false;

  const next = key.replaceAll(
    LOC_IN_KEY,
    (whole, lead: string, file: string, line: string, col: string) => {
      const map = maps.get(file);

      if (!map) {
        return whole;
      }

      const newLine = map.line(Number(line));

      if (newLine === null) {
        gone = true;

        return whole;
      }

      return `${lead}${file}:${newLine}:${map.col(Number(line), Number(col))}`;
    }
  );

  return gone ? null : next;
};

const remapIds = (scope: string, files: SourceFileChange[]): Move[] => {
  const ids = registries.get(scope);

  if (!ids || files.length === 0) {
    return [];
  }

  const maps = new Map(
    files.map((file) => [file.relative, lineMapOf(file.before, file.after)])
  );

  const moves: Move[] = [];

  for (const [key, ref] of ids.refByKey) {
    const to = movedKey(key, maps);

    if (to !== key) {
      moves.push({ from: key, ref, to });
    }
  }

  for (const move of moves) {
    ids.refByKey.delete(move.from);
  }

  for (const move of moves) {
    if (move.to === null) {
      ids.keyByRef.set(move.ref, GONE);
      continue;
    }

    const displaced = ids.refByKey.get(move.to);

    if (displaced && displaced !== move.ref) {
      ids.keyByRef.set(displaced, GONE);
    }

    ids.refByKey.set(move.to, move.ref);
    ids.keyByRef.set(move.ref, move.to);
  }

  return moves;
};

export { refForKey, isGoneRef, remapIds };

export type { Move };
