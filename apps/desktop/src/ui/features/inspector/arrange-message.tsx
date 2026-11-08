import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { Message } from "./arrange-model.js";

const toMessageRole = (message: Message): string => {
  if (message.kind === "error") {
    return "alert";
  }

  return "note";
};

const ArrangeMessage = ({
  message,
}: {
  readonly message: Message | null;
}): ReactElement | null => {
  if (!message) {
    return null;
  }

  if (message.kind === "ok") {
    return (
      <output className="ins-arrange-ok">
        <Icon name="check" size={12} />
        <span>{message.text}</span>
      </output>
    );
  }

  return (
    <div
      className={`ins-multi-note ins-arrange-note ${message.kind}`}
      role={toMessageRole(message)}
    >
      <Icon name="alert" size={14} />
      <span>{message.text}</span>
    </div>
  );
};

export { ArrangeMessage };
