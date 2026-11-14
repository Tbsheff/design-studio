import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { ChangeEvent, FormEvent } from "react";

import {
  call,
  clearPrototypeRoute,
  errorText,
  projectRoutes,
  prototypeRoute,
} from "./deps.js";
import type { FixtureOffer } from "./fixture-offer-model.js";

interface PrototypeCreate {
  readonly failure: string | null;
  readonly handlePrompt: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly isPending: boolean;
  readonly offer: FixtureOffer | null;
  readonly prompt: string;
  readonly routePath: string | null;
}

const toInitialRoute = (): string | null => prototypeRoute.get();

const usePrototypeCreate = (
  appProjectId: string,
  onCreated: (projectId: string) => void
): PrototypeCreate => {
  const [prompt, setPrompt] = useState("");
  const route = useMemo(() => toInitialRoute(), []);
  const [failure, setFailure] = useState<string | null>(null);
  const [offer, setOffer] = useState<FixtureOffer | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => clearPrototypeRoute, []);

  const handlePrompt = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setPrompt(event.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const text = prompt.trim();

      if (text === "") {
        return;
      }

      startTransition(async (): Promise<void> => {
        try {
          const created = await call(projectRoutes.createPrototypeProject, {
            level: null,
            name: null,
            projectId: appProjectId,
            prompt: text,
            routePath: route,
            shouldStartRun: true,
            viewport: null,
          });

          if (created.fixtureOffer === null) {
            onCreated(created.project.id);

            return;
          }

          setOffer({
            ...created.fixtureOffer,
            copyProjectId: created.project.id,
          });
        } catch (error: unknown) {
          setFailure(errorText(error));
        }
      });
    },
    [appProjectId, onCreated, prompt, route]
  );

  return {
    failure,
    handlePrompt,
    handleSubmit,
    isPending,
    offer,
    prompt,
    routePath: route,
  };
};

export { usePrototypeCreate };

export type { PrototypeCreate };
