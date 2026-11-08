import type {
  PortStartRequest,
  PortStartResult,
} from "@design-studio/contracts/port";
import { useCallback, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { errorText } from "../../api.js";
import { portApi } from "./port-api.js";
import type { PortTarget } from "./port-model.js";
import type { PortForm } from "./use-port-form.js";

const toStartPaths = (form: PortForm): string[] | null => {
  const paths = form.pages.picked.map((page) => page.path);

  if (paths.length === 1 && paths[0] === form.path) {
    return null;
  }

  return paths;
};

const toStartRequest = (
  target: PortTarget,
  form: PortForm,
  routePath: string
): PortStartRequest => {
  const request: PortStartRequest = {
    path: form.path,
    route: routePath,
    sourceProjectId: target.projectId,
    targetProjectId: form.chosenApp,
  };

  if (target.directionId !== null) {
    request.sourceDirectionId = target.directionId;
  }

  const paths = toStartPaths(form);

  if (paths) {
    request.paths = paths;
  }

  return request;
};

interface PortStart {
  failure: string | null;
  isBusy: boolean;
  started: PortStartResult | null;
  submit: (event: FormEvent) => void;
}

const usePortStart = (target: PortTarget, form: PortForm): PortStart => {
  const [isBusy, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [started, setStarted] = useState<PortStartResult | null>(null);

  const submit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (!form.isReady || isBusy || !form.cleanRoute) {
        return;
      }

      setFailure(null);
      const request = toStartRequest(target, form, form.cleanRoute);
      startTransition(async () => {
        try {
          setStarted(await portApi.start(request));
        } catch (error: unknown) {
          setFailure(errorText(error));
        }
      });
    },
    [form, isBusy, target]
  );

  return { failure, isBusy, started, submit };
};

export { usePortStart };

export type { PortStart };
