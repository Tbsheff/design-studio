import type {
  ComponentInstance,
  PropValue,
} from "@design-studio/contracts/props";
import { startTransition, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { toErrorMessage, toSavedStatus, toValuesWith } from "./props-model.js";
import type { PropsStatus } from "./props-model.js";
import { propsApi } from "./use-props-api.js";

interface PropEditInput {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly instance: ComponentInstance | null;
  readonly setInstance: Dispatch<SetStateAction<ComponentInstance | null>>;
  readonly setStatus: (status: PropsStatus) => void;
}

const usePropEdit = ({
  projectId,
  directionId,
  instance,
  setInstance,
  setStatus,
}: PropEditInput): ((name: string, value: PropValue | null) => void) =>
  useCallback(
    (name: string, value: PropValue | null) => {
      if (!instance || !directionId) {
        return;
      }

      setStatus({ kind: "saving" });
      setInstance({ ...instance, values: toValuesWith(instance, name, value) });

      startTransition(async () => {
        try {
          const result = await propsApi.setProps(
            projectId,
            directionId,
            instance.use,
            { [name]: value }
          );

          if (result.instance) {
            setInstance(result.instance);
          }

          setStatus(toSavedStatus(result));
        } catch (error) {
          setStatus({ kind: "error", text: toErrorMessage(error as Error) });
        }
      });
    },
    [projectId, directionId, instance, setInstance, setStatus]
  );

export { usePropEdit };
