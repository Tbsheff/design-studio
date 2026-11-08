import type { ReactElement } from "react";

import type { ClarifyAnswer } from "./chat-parts-model.js";

const AnsweredRow = ({ item }: { item: ClarifyAnswer }): ReactElement => (
  <div className="msg-answered-row">
    {item.question && <dt>{item.question}</dt>}
    <dd>{item.answer}</dd>
  </div>
);

export { AnsweredRow };
