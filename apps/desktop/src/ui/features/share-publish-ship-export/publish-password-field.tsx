import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { PUBLISH_PASSWORD_MIN } from "../../../shared/publish.js";
import { copy } from "./copy.js";

interface PublishPasswordFieldProps {
  readonly value: string;
  readonly onValue: (value: string) => void;
}

const PublishPasswordField = ({
  onValue,
  value,
}: PublishPasswordFieldProps): ReactElement => {
  const changeValue = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onValue(event.target.value);
    },
    [onValue]
  );

  return (
    <label className="field">
      <span>
        {`${copy.passwordPrefix} (${PUBLISH_PASSWORD_MIN} ${copy.passwordSuffix})`}
      </span>
      <input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={changeValue}
      />
    </label>
  );
};

export { PublishPasswordField };
