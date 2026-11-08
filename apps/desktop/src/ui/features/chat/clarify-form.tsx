import type { ClarifyQuestion } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { copy } from "./copy.js";
import { useRovingRadioGroup } from "./level-control.js";

const ClarifyQuestionField = ({
  item,
  answer,
  onAnswer,
  first,
}: {
  item: ClarifyQuestion;
  answer: string;
  onAnswer: (value: string) => void;
  first: boolean;
}): ReactElement => {
  const legendId = useId();
  let picked = "";

  if (item.options.includes(answer)) {
    picked = answer;
  }

  const radios = useRovingRadioGroup(item.options, picked, onAnswer);
  const firstRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (first) {
      firstRef.current?.focus();
    }
  }, [first]);

  return (
    <div className="clarify-q">
      <span className="clarify-legend" id={legendId}>
        {item.question}
      </span>
      <div className="clarify-options">
        <div
          tabIndex={0}
          className="clarify-choices"
          role="radiogroup"
          aria-labelledby={legendId}
          onKeyDown={radios.onKeyDown}
        >
          {item.options.map((option, index) => {
            const props = radios.item(option);
            const on = picked === option;

            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                className={cn("chip-toggle", on && "on")}
                tabIndex={
                  picked === "" ? (index === 0 ? 0 : -1) : props.tabIndex
                }
                ref={(element) => {
                  props.ref(element);

                  if (index === 0) {
                    firstRef.current = element;
                  }
                }}
                onClick={() => onAnswer(option)}
              >
                {on && <Icon name="check" size={12} />}
                {option}
              </button>
            );
          })}
        </div>
        <input
          className="clarify-other"
          aria-label={`Other answer: ${item.question}`}
          placeholder={copy.orTypeAn}
          value={picked ? "" : answer}
          onChange={(event) => onAnswer(event.target.value)}
        />
      </div>
    </div>
  );
};

const MOD = /Mac|iPhone|iPad/u.test(navigator.platform) ? "⌘" : "Ctrl+";

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
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    onBuild(
      questions.map((item) => ({
        answer: answers[item.id] ?? "",
        question: item.question,
      }))
    );
  };

  const set = (id: string, value: string): void =>
    setAnswers((current) => ({ ...current, [id]: value }));

  return (
    <form
      className="clarify"
      aria-labelledby="clarify-heading"
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        } else if (
          event.key === "Enter" &&
          (event.metaKey || event.ctrlKey) &&
          !busy
        ) {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
    >
      <div className="clarify-head">
        <Icon name="sparkle" size={14} />
        <h2 id="clarify-heading">{copy.aFewQuickQuestions}</h2>
        <span className="clarify-hint">{copy.shortBriefsBuildBetter}</span>
      </div>
      {questions.map((item, index) => (
        <ClarifyQuestionField
          key={item.id}
          item={item}
          answer={answers[item.id] ?? ""}
          onAnswer={(value) => set(item.id, value)}
          first={index === 0}
        />
      ))}
      <div className="clarify-foot">
        <button
          type="button"
          className="btn ghost small"
          onClick={onSkip}
          disabled={busy}
        >
          {copy.skipQuestions}
        </button>
        <button
          type="submit"
          className="btn primary small has-icon"
          disabled={busy}
          data-tip={`Build  ${MOD}↩`}
          data-tip-side="top"
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          {busy && <span className="spinner" />}
          {!busy && <Icon name="arrowUp" size={14} />}
          {busy && "Creating…"}
          {!busy && "Build with answers"}
        </button>
      </div>
    </form>
  );
};

export { ClarifyForm };
