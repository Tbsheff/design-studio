import { useCallback, useRef } from "react";

import type { VectorRequest } from "../../../shared/vector.js";
import { errorText } from "../../api.js";
import type {
  Commit,
  Drop,
  Placed,
  Point,
  VectorLayerProps,
} from "./vector-layer-types.js";
import { placeOf } from "./vector-place-model.js";
import type { Place } from "./vector-place-model.js";
import { runVector, vectorTool } from "./vector-tool-model.js";

const RESELECT_SHORT_MS = 500;

const RESELECT_MEDIUM_MS = 1200;

const RESELECT_LONG_MS = 2500;

const RESELECT_MS = [RESELECT_SHORT_MS, RESELECT_MEDIUM_MS, RESELECT_LONG_MS];

const toVectorRequest = (
  placed: Placed,
  place: Place,
  page: string | null
): VectorRequest => {
  const request = {
    ...placed,
    relativeParent: place.relativeParent,
    target: place.target,
  } as VectorRequest;

  if (page) {
    return { ...request, page } as VectorRequest;
  }

  return request;
};

const scheduleReselect = (
  post: VectorLayerProps["post"],
  first: { file: string; line: number; col: number; tag: string }
): void => {
  for (const wait of RESELECT_MS) {
    globalThis.setTimeout(
      () =>
        post({
          sourceLoc: `${first.file}:${first.line}:${first.col}`,
          tag: first.tag,
          text: "",
          type: "select-source",
        }),
      wait
    );
  }
};

const commitPlacement = async (
  props: VectorLayerProps,
  drop: Drop,
  build: (origin: Point) => Placed
): Promise<void> => {
  const { message, place } = placeOf(drop);

  if (place === null) {
    props.notify(message);

    return;
  }

  const request = toVectorRequest(
    build(place.origin),
    place,
    props.page ?? null
  );

  const result = await runVector(props.projectId, props.directionId, request);
  vectorTool.set(null);
  const [first] = result.select;

  if (first) {
    scheduleReselect(props.post, first);
  }
};

const useVectorCommit = (
  props: VectorLayerProps,
  dropAt: (point: Point) => Promise<Drop>
): Commit => {
  const busy = useRef(false);
  const { notify } = props;

  return useCallback(
    async (at: Point, build: (origin: Point) => Placed): Promise<void> => {
      if (busy.current) {
        return;
      }

      busy.current = true;

      try {
        await commitPlacement(props, await dropAt(at), build);
      } catch (error) {
        notify(errorText(error));
      }

      busy.current = false;
    },
    [props, dropAt, notify]
  );
};

export { useVectorCommit };
