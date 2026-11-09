import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { Icon } from "./icon.js";
import { toOptionalAttr } from "./optional-attr.js";
import { pick } from "./pick.js";
import { UiSelectMenu } from "./ui-select-menu.js";
import {
  CHEVRON_SIZE,
  COMBOBOX_ROLE,
  toSelectClass,
} from "./ui-select-model.js";
import type { UiSelectOption, UiSelectProps } from "./ui-select-model.js";
import { useUiSelect } from "./use-ui-select.js";

const UiSelect = <OptionValue extends string>(
  props: UiSelectProps<OptionValue>
): ReactElement => {
  const select = useUiSelect(props);
  const { active, current, host, isMounted, isOpen, listId } = select;
  const { button, onHover, onKeyDown, onPick, onToggle, root } = select;
  const hasActive = isOpen && active >= 0;
  const hasTip = !isOpen && Boolean(props.tip);
  const selected = props.options[current];
  const label = pick(current === -1, props.placeholder, selected?.label);
  const valueClass = pick(current === -1, " placeholder", "");

  const menu = (
    <UiSelectMenu
      attach={select.attach}
      listId={listId}
      placement={select.style}
      options={props.options}
      value={props.value}
      active={active}
      isOpen={isOpen}
      label={props["aria-label"]}
      labelledBy={props["aria-labelledby"]}
      onPick={onPick}
      onHover={onHover}
    />
  );

  return (
    <span ref={root} className={`ui-select-root ${props.className ?? ""}`}>
      <button
        ref={button}
        id={props.id}
        type="button"
        role={COMBOBOX_ROLE}
        className={toSelectClass(props.size)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={toOptionalAttr(isOpen, listId)}
        aria-activedescendant={toOptionalAttr(hasActive, `${listId}-${active}`)}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        disabled={props.disabled}
        data-tip={toOptionalAttr(hasTip, props.tip ?? "")}
        onClick={onToggle}
        onKeyDown={onKeyDown}
      >
        {props.icon ?? selected?.icon}
        <span className={`ui-select-value truncate${valueClass}`}>
          {label ?? ""}
        </span>
        <Icon name="chevronDown" size={CHEVRON_SIZE} />
      </button>
      {isMounted && host && createPortal(menu, host)}
    </span>
  );
};

export { UiSelect };

export type { UiSelectOption, UiSelectProps };
