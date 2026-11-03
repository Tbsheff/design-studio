import { useRef, useState } from "react";

import { type SetImageRequest } from "../../../shared/image.js";
import { fileData, imageApi, imageError, imageTargetOf } from "./image-api.js";
import { RESELECT_AFTER_MS, type Props } from "./image-model.js";

const useImageSet = (props: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);

  const reselect = () => {
    for (const wait of RESELECT_AFTER_MS) {
      window.setTimeout(
        () =>
          props.port?.current?.post({
            type: "select-selector",
            selector: props.selection.selector,
          }),
        wait
      );
    }
  };

  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);

  const send = async (
    change: Omit<SetImageRequest, "target">,
    file?: Blob | null
  ) => {
    try {
      const image = file ? await fileData(file) : undefined;

      const result = await imageApi.set(props.projectId, props.directionId, {
        target: imageTargetOf(props.selection),
        ...change,
        ...(image ? { image } : {}),
      });

      if (result.src) {
        setPlaced(String(result.src).split("/").pop() ?? null);
      }

      if (result.changed) {
        reselect();
      }
    } catch (failure) {
      setError(imageError(failure));
    }
  };

  const run = (
    change: Omit<SetImageRequest, "target">,
    file?: Blob | null
  ): Promise<void> => {
    if (!props.editable) {
      return Promise.resolve();
    }

    setError(null);
    pending.current += 1;
    setBusy(true);
    queue.current = queue.current
      .then(() => send(change, file))
      .finally(() => {
        pending.current -= 1;

        if (pending.current === 0) {
          setBusy(false);
        }
      });

    return queue.current;
  };

  return { busy, error, run, setError, placed };
};

export { useImageSet };
