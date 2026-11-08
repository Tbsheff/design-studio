import type { ClarifyQuestion } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";

interface ClarifyAnswer {
  answer: string;
  question: string;
}

interface ClarifyFormOptions {
  readonly busy: boolean;
  readonly questions: readonly ClarifyQuestion[];
  readonly onBuild: (answers: ClarifyAnswer[]) => void;
  readonly onCancel: () => void;
}

interface ClarifyFormState {
  readonly answers: Readonly<Record<string, string>>;
  readonly onAnswerFor: (id: string, value: string) => void;
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly onSubmit: (event: FormEvent) => void;
}

const useClarifyForm = (options: ClarifyFormOptions): ClarifyFormState => {
  const { busy, questions, onBuild, onCancel } = options;
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const onSubmit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      onBuild(
        questions.map((item) => ({
          answer: answers[item.id] ?? "",
          question: item.question,
        }))
      );
    },
    [answers, onBuild, questions]
  );

  const onAnswerFor = useCallback(
    (id: string, value: string): void =>
      setAnswers((current) => ({ ...current, [id]: value })),
    []
  );

  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();

        return;
      }

      const isSubmit =
        event.key === "Enter" && (event.metaKey || event.ctrlKey) && !busy;

      if (isSubmit) {
        event.preventDefault();
        form.requestSubmit();
      }
    };

    form.addEventListener("keydown", onKey);

    return (): void => form.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return { answers, formRef, onAnswerFor, onSubmit };
};

export { useClarifyForm };
