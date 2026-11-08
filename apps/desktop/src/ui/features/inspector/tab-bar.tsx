import { useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { TABS } from "./inspector-model.js";
import type { InspectorTab } from "./inspector-model.js";

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

  const onKeyDown = (event: KeyboardEvent): void => {
    const at = TABS.findIndex((token) => token.id === tab);

    const target = {
      ArrowLeft: at - 1,
      ArrowRight: at + 1,
      End: TABS.length - 1,
      Home: 0,
    }[event.key];

    if (target === undefined) {
      return;
    }

    event.preventDefault();
    const next = TABS[(target + TABS.length) % TABS.length]?.id ?? "simple";
    onTab(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      className="edit-tabs"
      role="tablist"
      aria-label={copy.editMode}
      onKeyDown={onKeyDown}
    >
      {TABS.map((tokenValue) => (
        <button
          key={tokenValue.id}
          ref={(el) => {
            refs.current[tokenValue.id] = el;
          }}
          type="button"
          role="tab"
          id={`edit-tab-${tokenValue.id}`}
          aria-selected={tab === tokenValue.id}
          aria-controls={`edit-pane-${tokenValue.id}`}
          tabIndex={tab === tokenValue.id ? 0 : -1}
          className={`edit-tab ${tab === tokenValue.id ? "on" : ""}`}
          onClick={() => onTab(tokenValue.id)}
        >
          {tokenValue.label}
        </button>
      ))}
    </div>
  );
};

export { TabBar };
