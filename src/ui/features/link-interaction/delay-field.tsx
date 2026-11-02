import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { LINK_DELAY_MAX, cleanDelay } from "./deps.js";
import type { PrototypeLink } from "./deps.js";
import { delayOf } from "./interaction-model.js";
import { TextCommitField } from "./text-commit-field.js";
import type { Interaction } from "./use-link-interaction.js";

interface DelayFieldProps {
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
}

const isDelay = (text: string): boolean => {
  const ms = Number(text);

  return text.trim() !== "" && ms >= 0 && ms <= LINK_DELAY_MAX;
};

const DelayField = ({ interaction, link }: DelayFieldProps): ReactElement => {
  const { handleSend } = interaction;
  const ms = String(delayOf(link));

  const handleDelay = useCallback(
    (text: string): void => {
      handleSend({ delayMs: cleanDelay(Number(text)) ?? 0, trigger: "delay" });
    },
    [handleSend]
  );

  return (
    <span className="proto-delay">
      <TextCommitField
        isValid={isDelay}
        label={copy.delay}
        placeholder={ms}
        size="ms"
        type="number"
        value={ms}
        onCommit={handleDelay}
      />
      <span className="proto-unit">{copy.delayUnit}</span>
    </span>
  );
};

export { DelayField };

export type { DelayFieldProps };
