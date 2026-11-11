import type { ReactElement } from "react";

import { CONNECT_CLIENTS } from "./connect-ai-model.js";
import type { ConnectClientId } from "./connect-ai-model.js";
import { ConnectAiOption } from "./connect-ai-option.js";
import { copy as uiCopy } from "./copy.js";
import { moveRadioFocus } from "./radio-keys.js";

interface ConnectAiClientsProps {
  readonly selected: ConnectClientId;
  readonly onSelect: (id: ConnectClientId) => void;
}

const ConnectAiClients = ({
  onSelect,
  selected,
}: ConnectAiClientsProps): ReactElement => (
  <div
    role="radiogroup"
    tabIndex={-1}
    aria-label={uiCopy.connectAiClients}
    className="connect-ai-clients"
    onKeyDown={moveRadioFocus}
  >
    {CONNECT_CLIENTS.map((client) => (
      <ConnectAiOption
        key={client.id}
        client={client}
        isSelected={client.id === selected}
        onSelect={onSelect}
      />
    ))}
  </div>
);

export { ConnectAiClients };
