import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";

interface DevServerUrlProps {
  readonly url: string;
  readonly onUrl: (url: string) => void;
}

const DevServerUrl = ({ url, onUrl }: DevServerUrlProps): ReactElement => {
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onUrl(event.target.value);
    },
    [onUrl]
  );

  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.preventDefault();
      }
    },
    []
  );

  return (
    <input
      className="mono"
      name="url"
      aria-label={copy.devServerUrl}
      value={url}
      placeholder={copy.httpLocalhost3000}
      spellCheck={false}
      autoComplete="off"
      onKeyDown={keyDown}
      onChange={change}
    />
  );
};

export { DevServerUrl };
