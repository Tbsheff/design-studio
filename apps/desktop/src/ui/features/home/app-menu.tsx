import type { ReactElement, RefObject } from "react";

import type { AppChip } from "./app-chip-model.js";
import { AppMenuHead } from "./app-menu-head.js";
import { AppMenuNext } from "./app-menu-next.js";
import { copy } from "./copy.js";
import { Pop } from "./pop.js";

interface AppMenuProps {
  readonly chip: AppChip;
  readonly homeDir: string | null;
  readonly trigger: RefObject<HTMLElement | null>;
  readonly isClosing: boolean;
  readonly onClose: (shouldRefocus: boolean) => void;
  readonly onChange: (patch: Partial<AppChip>) => void;
  readonly onTokensOnly: () => void;
}

const AppMenu = ({
  chip,
  homeDir,
  trigger,
  isClosing,
  onClose,
  onChange,
  onTokensOnly,
}: AppMenuProps): ReactElement => {
  const found = chip.inspection;
  const problem = chip.error ?? found?.problem ?? null;

  return (
    <Pop
      trigger={trigger}
      closing={isClosing}
      onClose={onClose}
      variant="ui-menu home-app-menu"
      label={copy.appOptions}
    >
      <AppMenuHead chip={chip} homeDir={homeDir} problem={problem} />
      {found?.kind === "next" && !problem && (
        <AppMenuNext
          chip={chip}
          onChange={onChange}
          onTokensOnly={onTokensOnly}
        />
      )}
    </Pop>
  );
};

export { AppMenu };

export type { AppMenuProps };
