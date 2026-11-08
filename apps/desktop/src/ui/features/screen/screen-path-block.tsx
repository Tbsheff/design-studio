import type { ChangeEvent, ReactElement } from "react";

import type { ScreenPlanWire } from "./screen-model.js";
import { hasPath } from "./screen-model.js";
import { ScreenPathField } from "./screen-path-field.js";
import { ScreenPathStatus } from "./screen-path-status.js";

interface ScreenPathBlockProps {
  readonly error: Error | null;
  readonly isLoading: boolean;
  readonly label: string;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly plan: ScreenPlanWire | null;
  readonly showFile: boolean;
  readonly value: string;
}

const ScreenPathBlock = ({
  error,
  isLoading,
  label,
  onChange,
  plan,
  showFile,
  value,
}: ScreenPathBlockProps): ReactElement => {
  const isTaken = plan !== null && !plan.isPathFree;

  return (
    <div>
      <ScreenPathField
        isTaken={isTaken}
        label={label}
        onChange={onChange}
        value={value}
      />
      <ScreenPathStatus
        error={error}
        hasPath={hasPath(value)}
        isLoading={isLoading}
        plan={plan}
        showFile={showFile}
      />
    </div>
  );
};

export { ScreenPathBlock };
