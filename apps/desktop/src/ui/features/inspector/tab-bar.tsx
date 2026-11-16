import { useCallback, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toInspectorTabs } from "./inspector-model.js";
import type { InspectorTab } from "./inspector-model.js";
import { TabButton } from "./tab-button.js";
import { toTabKeyTarget } from "./tab-keys-model.js";

const TabBar = ({
  tab,
  onTab,
  isTweaksShown,
}: {
  readonly tab: InspectorTab;
  readonly onTab: (tab: InspectorTab) => void;
  readonly isTweaksShown: boolean;
}): ReactElement => {
  const tabs = toInspectorTabs(isTweaksShown);

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
      const at = tabs.findIndex((token) => token.id === tab);
      const target = toTabKeyTarget(event.key, at, tabs.length);

      if (target === null) {
        return;
      }

      event.preventDefault();
      const next = tabs[(target + tabs.length) % tabs.length]?.id ?? "simple";
      onTab(next);
      refs.current[next]?.focus();
    },
    [onTab, tab, tabs]
  );

  return (
    <div className="edit-tabs" role="tablist" aria-label={copy.editMode}>
      {tabs.map((tokenValue) => (
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
