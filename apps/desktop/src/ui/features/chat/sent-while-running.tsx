import type { ReactElement } from "react";

import { copy } from "./copy.js";

const SentWhileRunning = ({ text }: { text: string }): ReactElement => (
  <div className="msg-inline-user" data-testid="sent-while-running">
    <span className="msg-inline-label">{copy.youWhileItRan}</span>
    <p className="whitespace-pre-wrap wrap-anywhere">{text}</p>
  </div>
);

export { SentWhileRunning };
