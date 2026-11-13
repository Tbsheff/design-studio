import type { DecisionWire } from "@design-studio/actions/run/decision/schema";
import { useRef } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { isShownOption, toShownOption } from "./decision-row-model.js";
import { DecisionRowOption } from "./decision-row-option.js";
import { DecisionRowOther } from "./decision-row-other.js";
import { MenuItem } from "./menu-item.js";
import { MenuPanel } from "./menu-panel.js";
import { PillCaret } from "./pill-caret.js";
import { useDecisionChip } from "./use-decision-row.js";
import type { PickDecision } from "./use-decision-row.js";

import styles from "./decision-row.module.css";

const DecisionRowChip = ({
  decision,
  isPending,
  onPick,
}: {
  readonly decision: DecisionWire;
  readonly isPending: boolean;
  readonly onPick: PickDecision;
}): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const chip = useDecisionChip(trigger, panel, decision.id, onPick);
  const shown = toShownOption(decision);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.chip}
        aria-haspopup="menu"
        aria-expanded={chip.menu.open}
        aria-label={`${decision.topic}: ${shown}. ${copy.decisionChange}`}
        data-tip={copy.decisionChange}
        data-picked={decision.picked !== null}
        disabled={isPending}
        onClick={chip.handleToggle}
      >
        <span className={styles.topic}>{decision.topic}</span>
        <span className={styles.value}>{shown}</span>
        <PillCaret />
      </button>
      <MenuPanel
        panel={panel}
        menu={chip.menu}
        menuClass="decision-menu"
        label={decision.topic}
      >
        {decision.options.map((option) => (
          <DecisionRowOption
            key={option}
            option={option}
            isChecked={isShownOption(decision, option)}
            onPick={chip.handleOption}
          />
        ))}
        <MenuItem label={copy.decisionOther} onPick={chip.handleOther} />
        {chip.isOtherOpen && (
          <DecisionRowOther
            onSubmit={chip.handleOption}
            onCancel={chip.handleOtherCancel}
          />
        )}
      </MenuPanel>
    </>
  );
};

export { DecisionRowChip };
