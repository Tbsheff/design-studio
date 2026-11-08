import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ACCESSIBILITY_ROLES } from "./deps.js";

import styles from "./accessibility.module.css";

interface RoleSelectProps {
  readonly disabled: boolean;
  readonly value: string;
  readonly onPick: (next: string) => void;
}

const ROLE_ID = "accessibility-role";

const ROLE_OPTIONS: readonly UiSelectOption[] = [
  { label: copy.unset, value: "" },
  ...ACCESSIBILITY_ROLES.map((role) => ({ label: role, value: role })),
];

const RoleSelect = ({
  disabled,
  value,
  onPick,
}: RoleSelectProps): ReactElement => (
  <div className="ins-field select">
    <label className={styles.label} htmlFor={ROLE_ID}>
      {copy.role}
    </label>
    <UiSelect
      aria-label={copy.role}
      disabled={disabled}
      id={ROLE_ID}
      options={ROLE_OPTIONS}
      tip={copy.roleTip}
      value={value}
      onChange={onPick}
    />
  </div>
);

export { RoleSelect };

export type { RoleSelectProps };
