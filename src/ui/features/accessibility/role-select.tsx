import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { ACCESSIBILITY_ROLES } from "./deps.js";

import styles from "./accessibility.module.css";

interface RoleSelectProps {
  readonly disabled: boolean;
  readonly value: string;
  readonly onPick: (next: string) => void;
}

const ROLE_ID = "accessibility-role";

const RoleSelect = ({
  disabled,
  value,
  onPick,
}: RoleSelectProps): ReactElement => {
  const handlePick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onPick(event.target.value);
    },
    [onPick]
  );

  return (
    <label
      className="ins-field select"
      data-tip={copy.roleTip}
      htmlFor={ROLE_ID}
    >
      <span className={styles.label}>{copy.role}</span>
      <select
        aria-label={copy.role}
        className="ins-input"
        disabled={disabled}
        id={ROLE_ID}
        value={value}
        onChange={handlePick}
      >
        <option value="">{copy.unset}</option>
        {ACCESSIBILITY_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </label>
  );
};

export { RoleSelect };

export type { RoleSelectProps };
