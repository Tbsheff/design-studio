import type { CompiledTokenEntry } from "@design-studio/contracts";
import type { ReactNode } from "react";

import type {
  TokenFieldState,
  TokenMode,
} from "../../../shared/token-match.js";
import { toMiniLabel, toMiniTip } from "./token-control-model.js";
import { TokenFieldButton } from "./token-field-button.js";

interface TriggerProps {
  readonly current: string | null;
  readonly entries: CompiledTokenEntry[];
  readonly isExpanded: boolean;
  readonly label: string;
  readonly mode: TokenMode;
  readonly onToggle: () => void;
  readonly state: TokenFieldState;
  readonly variant: "field" | "mini";
}

const TokenControlTrigger = (props: TriggerProps): ReactNode => {
  const { current, label, onToggle, state } = props;

  if (props.variant === "field") {
    return (
      <TokenFieldButton
        state={state}
        entries={props.entries}
        mode={props.mode}
        label={label}
        isExpanded={props.isExpanded}
        onClick={onToggle}
      />
    );
  }

  return (
    <button
      type="button"
      className="tk-dot"
      aria-label={toMiniLabel(state, label)}
      data-tip={toMiniTip(state, current)}
      onClick={onToggle}
    />
  );
};

export { TokenControlTrigger };
