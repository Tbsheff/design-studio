import type { ReactElement } from "react";

import { CONNECT_CLIENTS } from "./connect-ai-model.js";
import type { ConnectClientId } from "./connect-ai-model.js";
import { copy as uiCopy } from "./copy.js";
import { Segmented } from "./segmented.js";
import type { SegmentOption } from "./segmented.js";

interface ConnectAiClientsProps {
  readonly selected: ConnectClientId;
  readonly onSelect: (id: ConnectClientId) => void;
}

const CLIENT_OPTIONS: readonly SegmentOption<ConnectClientId>[] =
  CONNECT_CLIENTS.map((client) => ({
    icon: null,
    id: client.id,
    label: client.title,
  }));

const ConnectAiClients = ({
  onSelect,
  selected,
}: ConnectAiClientsProps): ReactElement => (
  <Segmented
    label={uiCopy.connectAiClients}
    value={selected}
    options={CLIENT_OPTIONS}
    onChange={onSelect}
  />
);

export { ConnectAiClients };
