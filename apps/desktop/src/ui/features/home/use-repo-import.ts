import type { Project } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";

import { api, errorText } from "../../api.js";
import { useLive } from "../../platform/live-store.js";
import { copy } from "./copy.js";
import { stopRepoImport, repoImportStore } from "./repo-import-model.js";

interface RepoImport {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly isOpen: boolean;
  readonly isPending: boolean;
  readonly onImport: () => void;
  readonly onKey: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onText: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly problem: string | null;
  readonly value: string;
}

const useRepoImport = (onOpen: (project: Project) => void): RepoImport => {
  const isOpen = useLive(repoImportStore);
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const onText = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
    setProblem(null);
  }, []);

  const runImport = useCallback(
    async (url: string): Promise<void> => {
      try {
        const { project } = await api.importRepo(url);
        setValue("");
        stopRepoImport();
        onOpen(project);
      } catch (error) {
        setProblem(errorText(error));
      }
    },
    [onOpen]
  );

  const onImport = useCallback((): void => {
    const url = value.trim();

    if (url === "") {
      setProblem(copy.repoImportEmpty);

      return;
    }

    setProblem(null);
    startTransition(() => runImport(url));
  }, [runImport, value]);

  const onKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        onImport();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        stopRepoImport();
      }
    },
    [onImport]
  );

  return {
    inputRef,
    isOpen,
    isPending,
    onImport,
    onKey,
    onText,
    problem,
    value,
  };
};

export { useRepoImport };

export type { RepoImport };
