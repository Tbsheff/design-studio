import type { ReactElement } from "react";

const RuleGroup = ({
  messages,
  rule,
}: {
  messages: string[];
  rule: string;
}): ReactElement => (
  <li>
    <span className="badge">{rule}</span>
    <ul className="lib-check-messages">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  </li>
);

export { RuleGroup };
