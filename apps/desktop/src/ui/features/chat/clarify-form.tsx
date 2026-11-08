import type { ClarifyQuestion } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { ClarifyFoot } from "./clarify-foot.js";
import { ClarifyHead } from "./clarify-head.js";
import { ClarifyQuestionField } from "./clarify-question-field.js";
import { useClarifyForm } from "./use-clarify-form.js";

const ClarifyForm = ({
  questions,
  busy,
  onBuild,
  onSkip,
  onCancel,
}: {
  questions: ClarifyQuestion[];
  busy: boolean;
  onBuild: (answers: { question: string; answer: string }[]) => void;
  onSkip: () => void;
  onCancel: () => void;
}): ReactElement => {
  const { answers, formRef, onAnswerFor, onSubmit } = useClarifyForm({
    busy,
    onBuild,
    onCancel,
    questions,
  });

  return (
    <form
      className="clarify"
      aria-labelledby="clarify-heading"
      onSubmit={onSubmit}
      ref={formRef}
    >
      <ClarifyHead />
      {questions.map((item, index) => (
        <ClarifyQuestionField
          key={item.id}
          item={item}
          answer={answers[item.id] ?? ""}
          onAnswerFor={onAnswerFor}
          first={index === 0}
        />
      ))}
      <ClarifyFoot busy={busy} onSkip={onSkip} />
    </form>
  );
};

export { ClarifyForm };
