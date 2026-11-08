import type { ClarifyQuestion } from "@design-studio/contracts";
import { useCallback, useEffect, useId, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { ClarifyChoices } from "./clarify-choices.js";
import { copy } from "./copy.js";
import { useRovingRadioGroup } from "./use-roving-radio-group.js";

const toPicked = (options: readonly string[], answer: string): string => {
  if (options.includes(answer)) {
    return answer;
  }

  return "";
};

const answerText = (picked: string, answer: string): string => {
  if (picked) {
    return "";
  }

  return answer;
};

const ClarifyQuestionField = ({
  item,
  answer,
  onAnswerFor,
  first,
}: {
  item: ClarifyQuestion;
  answer: string;
  onAnswerFor: (id: string, value: string) => void;
  first: boolean;
}): ReactElement => {
  const legendId = useId();

  const onAnswer = useCallback(
    (value: string): void => onAnswerFor(item.id, value),
    [onAnswerFor, item.id]
  );

  const picked = toPicked(item.options, answer);

  const { register, tabIndexOf, onKeyDown } = useRovingRadioGroup(
    item.options,
    picked,
    onAnswer
  );

  const firstRef = useRef<HTMLButtonElement | null>(null);
  const firstOption = item.options[0] ?? "";

  useEffect(() => {
    if (first) {
      firstRef.current?.focus();
    }
  }, [first]);

  const registerOption = useCallback(
    (option: string, element: HTMLButtonElement | null): void => {
      register(option, element);

      if (option === firstOption) {
        firstRef.current = element;
      }
    },
    [register, firstOption]
  );

  const changeOther = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onAnswer(event.target.value),
    [onAnswer]
  );

  return (
    <div className="clarify-q">
      <span className="clarify-legend" id={legendId}>
        {item.question}
      </span>
      <div className="clarify-options">
        <ClarifyChoices
          labelledBy={legendId}
          options={item.options}
          picked={picked}
          tabIndexOf={tabIndexOf}
          onKeyDown={onKeyDown}
          onPick={onAnswer}
          onRegister={registerOption}
        />
        <input
          className="clarify-other"
          aria-label={`Other answer: ${item.question}`}
          placeholder={copy.orTypeAn}
          value={answerText(picked, answer)}
          onChange={changeOther}
        />
      </div>
    </div>
  );
};

export { ClarifyQuestionField };
