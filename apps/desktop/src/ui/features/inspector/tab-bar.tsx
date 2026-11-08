import { useCallback, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { TABS } from "./inspector-model.js";
import type { InspectorTab } from "./inspector-model.js";
import { TabButton } from "./tab-button.js";
import { toTabKeyTarget } from "./tab-keys-model.js";

const TabBar = ({
  tab,
  onTab,
}: {
  readonly tab: InspectorTab;
  readonly onTab: (tab: InspectorTab) => void;
}): ReactElement => {
  const refs = useRef<Partial<Record<InspectorTab, HTMLButtonElement | null>>>(
    {}
  );

  const handleRegister = useCallback(
    (id: InspectorTab, el: HTMLButtonElement | null) => {
      refs.current[id] = el;
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      const at = TABS.findIndex((token) => token.id === tab);
      const target = toTabKeyTarget(event.key, at, TABS.length);

      if (target === null) {
        return;
      }

      event.preventDefault();
      const next = TABS[(target + TABS.length) % TABS.length]?.id ?? "simple";
      onTab(next);
      refs.current[next]?.focus();
    },
    [onTab, tab]
  );

  return (
    <div className="edit-tabs" role="tablist" aria-label={copy.editMode}>
      {TABS.map((tokenValue) => (
        <TabButton
          key={tokenValue.id}
          id={tokenValue.id}
          label={tokenValue.label}
          isSelected={tab === tokenValue.id}
          onTab={onTab}
          onKeyDown={handleKeyDown}
          onRegister={handleRegister}
        />
      ))}
    </div>
  );
};

export { TabBar };
