import type { ShipResult } from "@design-studio/contracts/ship";
import { useCallback, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { errorText } from "../../api.js";
import { shipApi } from "./ship-api.js";
import type { shipRequestOf } from "./ship-model.js";

type ShipRequestValue = NonNullable<ReturnType<typeof shipRequestOf>>;

interface ShipSubmit {
  readonly result: ShipResult | null;
  readonly failure: string | null;
  readonly isBusy: boolean;
  readonly submit: (event: FormEvent) => void;
}

const useShipSubmit = (
  projectId: string,
  request: ShipRequestValue | null
): ShipSubmit => {
  const [result, setResult] = useState<ShipResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isBusy, startTransition] = useTransition();

  const submit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (!request || isBusy) {
        return;
      }

      setFailure(null);
      startTransition(async () => {
        try {
          setResult(await shipApi.ship(projectId, request));
        } catch (error) {
          setFailure(errorText(error as Error));
        }
      });
    },
    [isBusy, projectId, request]
  );

  return { failure, isBusy, result, submit };
};

export { useShipSubmit };
