import type {
  ClarifyQuestion,
  ProjectKind,
  ProjectSettings,
} from "@design-studio/contracts";
import {
  formatAnswers,
  needsQuestions,
} from "@design-studio/contracts/clarify";
import type { FormEvent, RefObject } from "react";

import { api, errorText } from "../../api.js";
import { markComposerIntent } from "../../platform/focus.js";
import type { AppChip } from "./app-chip-model.js";
import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";
import type { ContextDraft } from "./context-drafts-model.js";
import { focusRequest } from "./focus-bus-model.js";
import { createFromHome } from "./home-model.js";
import type { Busy } from "./home-model.js";
import { homePrefs } from "./home-prefs-model.js";
import { importContexts } from "./use-context-import.js";
import { runWorkspacePrototype } from "./use-workspace-submit.js";
import { isFolderWorkspace } from "./workspace-model.js";
import type { Workspace } from "./workspace-model.js";

type ParsedSettings =
  | { readonly settings: ProjectSettings }
  | { readonly error: string };

interface ClarifyAnswer {
  readonly question: string;
  readonly answer: string;
}

interface SubmitInput {
  readonly busy: Busy;
  readonly chip: AppChip | null;
  readonly clarifyRef: RefObject<HTMLDivElement | null>;
  readonly contexts: ContextDraft[];
  readonly designCount: number;
  readonly designMd: string;
  readonly images: ImageDraft[];
  readonly isEditApp: boolean;
  readonly kind: ProjectKind;
  readonly location: string | null;
  readonly onOpen: (projectId: string) => void;
  readonly packId: string | null;
  readonly parsed: ParsedSettings;
  readonly prompt: string;
  readonly questions: ClarifyQuestion[] | null;
  readonly references: ReferenceDraft[];
  readonly setBusy: (busy: Busy) => void;
  readonly setFormError: (message: string | null) => void;
  readonly setQuestions: (questions: ClarifyQuestion[] | null) => void;
  readonly submitChip: (text: string) => void;
  readonly workspace: Workspace | null;
}

interface HomeSubmit {
  readonly build: (finalPrompt: string) => Promise<void>;
  readonly buildWithAnswers: (answers: ClarifyAnswer[]) => Promise<void>;
  readonly cancelQuestions: () => void;
  readonly create: (formEvent: FormEvent) => Promise<void>;
  readonly skipQuestions: () => Promise<void>;
}

const getQuestions = async (text: string): Promise<ClarifyQuestion[]> => {
  try {
    const asked = await api.clarify(text);

    return asked.questions;
  } catch {
    return [];
  }
};

const runClarifySubmit = (host: HTMLDivElement | null): void => {
  const form = host?.firstElementChild;

  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
  }
};

const toBeforeRun = (
  contexts: ContextDraft[]
): ((projectId: string) => Promise<void>) | null => {
  if (contexts.length === 0) {
    return null;
  }

  return (projectId) => importContexts(projectId, contexts);
};

const runBuild = async (
  input: SubmitInput,
  finalPrompt: string
): Promise<void> => {
  const { parsed, setBusy, setFormError } = input;

  if ("error" in parsed) {
    setFormError(parsed.error);

    return;
  }

  setBusy("create");
  setFormError(null);

  try {
    const project = await createFromHome({
      beforeRun: toBeforeRun(input.contexts),
      designCount: input.designCount,
      designMd: input.designMd,
      images: input.images,
      kind: input.kind,
      location: input.location,
      packId: input.packId,
      prompt: finalPrompt,
      references: input.references,
      settings: parsed.settings,
    });

    markComposerIntent();
    input.onOpen(project.id);
  } catch (error) {
    setFormError(errorText(error));
    setBusy(null);
  }
};

const isPrototypeTarget = (input: SubmitInput): boolean =>
  isFolderWorkspace(input.workspace) &&
  !(input.isEditApp && input.workspace?.kind === "app");

const startPrototype = async (
  input: SubmitInput,
  text: string
): Promise<void> => {
  const { parsed, workspace } = input;

  if (workspace === null || text === "") {
    return;
  }

  if ("error" in parsed) {
    input.setFormError(parsed.error);

    return;
  }

  await runWorkspacePrototype({
    contexts: input.contexts,
    images: input.images,
    level: parsed.settings.defaultLevel,
    onOpen: input.onOpen,
    prompt: text,
    references: input.references,
    setBusy: input.setBusy,
    setFormError: input.setFormError,
    workspace,
  });
};

const useHomeSubmit = (input: SubmitInput): HomeSubmit => {
  const { busy, chip, prompt, questions } = input;
  const { setBusy, setFormError, setQuestions } = input;

  const build = (finalPrompt: string): Promise<void> =>
    runBuild(input, finalPrompt);

  const create = async (formEvent: FormEvent): Promise<void> => {
    formEvent.preventDefault();
    const text = prompt.trim();

    if (busy !== null) {
      return;
    }

    if (isPrototypeTarget(input)) {
      await startPrototype(input, text);

      return;
    }

    if (chip) {
      input.submitChip(text);

      return;
    }

    if (!text) {
      return;
    }

    if (questions !== null) {
      runClarifySubmit(input.clarifyRef.current);

      return;
    }

    if (homePrefs.get().shouldAskFirst && needsQuestions(text)) {
      setBusy("ask");
      setFormError(null);
      const asked = await getQuestions(text);
      setBusy(null);

      if (asked.length > 0) {
        setQuestions(asked);

        return;
      }
    }

    await build(text);
  };

  const buildWithAnswers = (answers: ClarifyAnswer[]): Promise<void> =>
    build(formatAnswers(prompt, answers));

  const skipQuestions = (): Promise<void> => build(prompt.trim());

  const cancelQuestions = (): void => {
    setQuestions(null);
    focusRequest("prompt", false, true);
  };

  return { build, buildWithAnswers, cancelQuestions, create, skipQuestions };
};

export { useHomeSubmit };

export type { ClarifyAnswer, HomeSubmit, ParsedSettings, SubmitInput };
