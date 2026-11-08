import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { AnsweredRow } from "./answered-row.js";
import type { ClarifyAnswer } from "./chat-parts-model.js";
import { copy } from "./copy.js";

const CHECK_ICON_SIZE = 12;

const AnsweredCard = ({
  answers,
}: {
  answers: ClarifyAnswer[];
}): ReactElement | null => {
  if (answers.length === 0) {
    return null;
  }

  return (
    <div className="msg-answered" data-testid="clarify-answers">
      <span className="msg-answered-head">
        <Icon name="check" size={CHECK_ICON_SIZE} />
        {copy.youAnswered}
      </span>
      <dl className="msg-answered-list">
        {answers.map((item) => (
          <AnsweredRow key={`${item.question}|${item.answer}`} item={item} />
        ))}
      </dl>
    </div>
  );
};

export { AnsweredCard };
