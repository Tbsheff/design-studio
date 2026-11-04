import { useCallback, useId } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { SearchStatus } from "./image-search-api.js";

import styles from "./image-search.module.css";

interface SearchOffProps {
  readonly isPending: boolean;
  readonly onSetting: (isOn: boolean) => void;
  readonly status: SearchStatus;
}

const SearchOff = ({
  isPending,
  onSetting,
  status,
}: SearchOffProps): ReactElement => {
  const switchId = useId();

  const handleSettingSave = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onSetting(event.target.checked);
    },
    [onSetting]
  );

  return (
    <div className={styles.off}>
      <p>{copy.offBody}</p>
      <label className={styles.switch} htmlFor={switchId}>
        <input
          aria-checked={status.setting}
          checked={status.setting}
          disabled={isPending}
          id={switchId}
          role="switch"
          type="checkbox"
          onChange={handleSettingSave}
        />
        {copy.offSwitch}
      </label>
      <p>{copy.offEnv}</p>
    </div>
  );
};

export { SearchOff };
