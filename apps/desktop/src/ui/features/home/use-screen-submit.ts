import type { useHomeBase } from "./use-home-base.js";
import type { useHomeComposer } from "./use-home-composer.js";
import type { useHomeLibrary } from "./use-home-library.js";
import type { useHomeRefs } from "./use-home-refs.js";
import { useHomeSubmit } from "./use-home-submit.js";
import type {
  HomeSubmit,
  ParsedSettings,
  SubmitInput,
} from "./use-home-submit.js";

type DraftParts = Pick<
  SubmitInput,
  "designCount" | "designMd" | "kind" | "prompt" | "questions" | "setQuestions"
>;

interface ScreenSubmitParts {
  readonly base: ReturnType<typeof useHomeBase>;
  readonly refs: ReturnType<typeof useHomeRefs>;
  readonly draft: DraftParts;
  readonly lib: ReturnType<typeof useHomeLibrary>;
  readonly composer: ReturnType<typeof useHomeComposer>;
  readonly packId: string | null;
  readonly parsed: ParsedSettings;
  readonly openHome: (projectId: string) => void;
}

const useScreenSubmit = (parts: ScreenSubmitParts): HomeSubmit => {
  const { base, refs, draft, lib, composer, packId, parsed } = parts;
  const { openHome: onOpen } = parts;
  const { busy, setBusy, setFormError } = base;
  const { clarifyRef } = refs;
  const { designCount, designMd, kind, prompt } = draft;
  const { questions, setQuestions } = draft;
  const { attach, flow } = composer;
  const { contexts, images, references } = attach;
  const { location } = lib;
  const { chip } = flow.app;
  const { submitChip } = flow;

  return useHomeSubmit({
    busy,
    chip,
    clarifyRef,
    contexts,
    designCount,
    designMd,
    images,
    kind,
    location,
    onOpen,
    packId,
    parsed,
    prompt,
    questions,
    references,
    setBusy,
    setFormError,
    setQuestions,
    submitChip,
  });
};

export { useScreenSubmit };

export type { ScreenSubmitParts };
