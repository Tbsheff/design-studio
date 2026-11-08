import { useCallback } from "react";
import type { ReactElement } from "react";

import { toLocationText } from "./errors-model.js";
import type { ErrorLike } from "./errors-model.js";
import { ErrorsSendButton } from "./errors-send-button.js";

interface ErrorsItemProps<Entry extends ErrorLike> {
  readonly entry: Entry;
  readonly onSend: (entry: Entry) => void;
}

const ErrorsItem = <Entry extends ErrorLike>({
  entry,
  onSend,
}: ErrorsItemProps<Entry>): ReactElement => {
  const sendEntry = useCallback((): void => {
    onSend(entry);
  }, [entry, onSend]);

  return (
    <li>
      <div className="row between">
        <span className="badge fail">{entry.source}</span>
        <ErrorsSendButton onSend={sendEntry} />
      </div>
      <div className="mono error-msg">{entry.message}</div>
      {entry.file && (
        <div className="mono error-loc">{toLocationText(entry)}</div>
      )}
    </li>
  );
};

export { ErrorsItem };
