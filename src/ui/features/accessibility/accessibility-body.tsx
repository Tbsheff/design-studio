import { useMemo } from "react";
import type { ReactElement } from "react";

import { attrsOf, isImageTag, pairOf } from "./accessibility-model.js";
import { AccessibilityTextField } from "./accessibility-text-field.js";
import { AltFields } from "./alt-fields.js";
import { ContrastRow } from "./contrast-row.js";
import { copy } from "./copy.js";
import type { SelectionContext } from "./deps.js";
import { NameLine } from "./name-line.js";
import { RoleSelect } from "./role-select.js";
import type { AccessibilityHandlers } from "./use-accessibility-handlers.js";
import type { Accessibility } from "./use-accessibility.js";

import styles from "./accessibility.module.css";

interface AccessibilityBodyProps {
  readonly accessibility: Accessibility;
  readonly handlers: AccessibilityHandlers;
  readonly target: SelectionContext;
}

const AccessibilityBody = ({
  accessibility,
  handlers,
  target,
}: AccessibilityBodyProps): ReactElement => {
  const attrs = useMemo(() => attrsOf(target.outerHTML), [target.outerHTML]);
  const disabled = accessibility.isPending || target.source === null;
  const { report } = accessibility;
  const pair = pairOf(report, target.selector);

  return (
    <div className={styles.body}>
      <NameLine node={report?.root ?? null} />
      <RoleSelect
        disabled={disabled}
        value={attrs.role}
        onPick={handlers.handleRole}
      />
      <AccessibilityTextField
        disabled={disabled}
        id="accessibility-label"
        inputMode="text"
        label={copy.ariaLabel}
        tip={copy.ariaLabelTip}
        value={attrs.ariaLabel}
        onCommit={handlers.handleLabel}
      />
      {isImageTag(target.tag) && (
        <AltFields alt={attrs.alt} disabled={disabled} handlers={handlers} />
      )}
      <AccessibilityTextField
        disabled={disabled}
        id="accessibility-tab-index"
        inputMode="numeric"
        label={copy.tabIndex}
        tip={copy.tabIndexTip}
        value={attrs.tabIndex}
        onCommit={handlers.handleTabIndex}
      />
      <ContrastRow
        disabled={accessibility.isPending}
        pair={pair}
        onFix={accessibility.handleFix}
      />
    </div>
  );
};

export { AccessibilityBody };

export type { AccessibilityBodyProps };
