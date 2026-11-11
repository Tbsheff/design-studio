import { useCallback, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { call, errorText, projectRoutes } from "./deps.js";

interface PrototypeCreate {
  readonly failure: string | null;
  readonly handlePrompt: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly isPending: boolean;
  readonly prompt: string;
}

const usePrototypeCreate = (
  appProjectId: string,
  onCreated: (projectId: string) => void
): PrototypeCreate => {
  const [prompt, setPrompt] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
            shouldStartRun: true,
          });

          onCreated(created.project.id);
        } catch (error: unknown) {
          setFailure(errorText(error));
        }
      });
    },
    [appProjectId, onCreated, prompt]
  );

  return { failure, handlePrompt, handleSubmit, isPending, prompt };
};

export { usePrototypeCreate };

export type { PrototypeCreate };
