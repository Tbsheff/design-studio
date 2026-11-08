import type {
  ComponentInstance,
  VariantGroup,
  VariantOption,
} from "@design-studio/contracts/props";
import { startTransition, useCallback } from "react";

import { toErrorMessage } from "./props-model.js";
import type { ClassBody, PropsStatus } from "./props-model.js";
import { propsApi } from "./use-props-api.js";

interface VariantSendInput {
  readonly projectId: string;
  readonly directionId: string;
  readonly instance: ComponentInstance;
  readonly group: VariantGroup | null;
  readonly option: VariantOption | null;
  readonly onStatus: (status: PropsStatus) => void;
}

const useVariantSend = ({
  projectId,
  directionId,
  instance,
  group,
  option,
  onStatus,
}: VariantSendInput): ((body: ClassBody) => void) =>
  useCallback(
    (body: ClassBody) => {
      const cva = instance.component?.cva;
      const file = instance.component?.file;

      if (!cva || !file || !group || !option) {
        return;
      }

      onStatus({ kind: "saving" });

      startTransition(async () => {
        try {
          const result = await propsApi.variantClasses(projectId, directionId, {
            cva: cva.name,
            file,
            prop: group.prop,
            value: option.value,
            ...body,
          });

          onStatus({
            kind: "saved",
            text:
              result.note ??
              `${group.prop} ${option.value}: ${result.classes.join(" ")}`,
          });
        } catch (error) {
          onStatus({ kind: "error", text: toErrorMessage(error as Error) });
        }
      });
    },
    [projectId, directionId, instance, group, option, onStatus]
  );

export { useVariantSend };
