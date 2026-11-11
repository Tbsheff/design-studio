import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ConnectClient, ConnectClientId } from "./connect-ai-model.js";

interface ConnectAiOptionProps {
  readonly client: ConnectClient;
  readonly isSelected: boolean;
  readonly onSelect: (id: ConnectClientId) => void;
}

const RADIO_ROLE = "radio";

const toTabIndex = (isSelected: boolean): number => {
  if (isSelected) {
    return 0;
  }

  return -1;
};

const ConnectAiOption = ({
  client,
  isSelected,
  onSelect,
}: ConnectAiOptionProps): ReactElement => {
  const select = useCallback(
    (): void => onSelect(client.id),
    [client.id, onSelect]
  );

  return (
    <button
      type="button"
      role={RADIO_ROLE}
      aria-checked={isSelected}
      tabIndex={toTabIndex(isSelected)}
      className="connect-ai-option"
      data-testid={`connect-ai-${client.id}`}
      onClick={select}
    >
      <span className="connect-ai-icon" aria-hidden="true">
        <Icon name={client.icon} size={16} />
      </span>
      <span className="connect-ai-option-text">
        <strong>{client.title}</strong>
        <span>{client.note}</span>
      </span>
    </button>
  );
};

export { ConnectAiOption };
