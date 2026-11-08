import { useRef, useState, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { SetImageRequest } from "../../../shared/image.js";
import { RESELECT_AFTER_MS } from "./image-model.js";
import type { Props } from "./image-model.js";
import {
  toFileData,
  imageApi,
  toImageError,
  toImageTarget,
} from "./use-image-api.js";

type ImageChange = Omit<SetImageRequest, "target">;

interface UseImageSetResult {
  readonly isBusy: boolean;
  readonly error: string | null;
  readonly placed: string | null;
  readonly run: (change: ImageChange, file: Blob | null) => Promise<void>;
  readonly setError: Dispatch<SetStateAction<string | null>>;
}

const toPlacedName = (src: string): string | null =>
  src.split("/").pop() ?? null;

interface SendHandlers {
  readonly onChanged: () => void;
  readonly onFailure: (message: string) => void;
  readonly onPlaced: (name: string | null) => void;
}

const runImageSet = async (
  props: Props,
  change: ImageChange,
  file: Blob | null,
  handlers: SendHandlers
): Promise<void> => {
  try {
    const request: SetImageRequest = {
      target: toImageTarget(props.selection),
      ...change,
    };

    if (file) {
      request.image = await toFileData(file);
    }

    const result = await imageApi.set(
      props.projectId,
      props.directionId,
      request
    );

    if (result.src) {
      handlers.onPlaced(toPlacedName(String(result.src)));
    }

    if (result.changed) {
      handlers.onChanged();
    }
  } catch (error) {
    handlers.onFailure(toImageError(error));
  }
};

const useReselect =
  (props: Props): (() => void) =>
  () => {
    for (const wait of RESELECT_AFTER_MS) {
      globalThis.setTimeout(
        () =>
          props.port?.current?.post({
            selector: props.selection.selector,
            type: "select-selector",
          }),
        wait
      );
    }
  };

const useImageSet = (props: Props): UseImageSetResult => {
  const [isBusy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);
  const reselect = useReselect(props);
  const queue = useRef<Promise<void> | null>(null);

  const send = (change: ImageChange, file: Blob | null): Promise<void> =>
    runImageSet(props, change, file, {
      onChanged: reselect,
      onFailure: setError,
      onPlaced: setPlaced,
    });

  const sendAfter = async (
    previous: Promise<void>,
    change: ImageChange,
    file: Blob | null
  ): Promise<void> => {
    await previous;
    await send(change, file);
  };

  const run = (change: ImageChange, file: Blob | null): Promise<void> => {
    if (!props.isEditable) {
      return Promise.resolve();
    }

    setError(null);

    const job = sendAfter(queue.current ?? Promise.resolve(), change, file);
    queue.current = job;
    startTransition(async () => {
      await job;
    });

    return job;
  };

  return { error, isBusy, placed, run, setError };
};

export { useImageSet };
