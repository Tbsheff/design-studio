import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  ReactElement,
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  RefObject,
} from "react";
import { createPortal } from "react-dom";

import { Icon } from "./Icon";
import { placeFixed } from "./popover-placement.js";

interface UiSelectOption<OptionValue extends string = string> {
  value: OptionValue;
  label: string;
  disabled?: boolean;
}

interface Props<OptionValue extends string> {
  value: OptionValue;
  options: readonly UiSelectOption<OptionValue>[];
  onChange: (value: OptionValue) => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  placeholder?: string;
  tip?: string;
  icon?: ReactNode;
}

const HIDDEN: CSSProperties = {
  left: 0,
  opacity: 0,
  pointerEvents: "none",
  top: 0,
};

const step = (
  options: readonly UiSelectOption[],
  from: number,
  delta: 1 | -1
): number => {
  for (let index = 1; index <= options.length; index += 1) {
    const at = (from + delta * index + options.length * 2) % options.length;

    if (!options[at]?.disabled) {
      return at;
    }
  }

  return from;
};

const edge = (options: readonly UiSelectOption[], last: boolean): number => {
  const order = options.map((_, index) => index);

  if (last) {
    order.reverse();
  }

  return order.find((index) => !options[index]?.disabled) ?? -1;
};

const typeahead = (
  options: readonly UiSelectOption[],
  from: number,
  query: string
): number => {
  const needle = query.toLowerCase();

  for (let index = 1; index <= options.length; index += 1) {
    const at = (from + index) % options.length;
    const option = options[at];

    if (
      option &&
      !option.disabled &&
      option.label.toLowerCase().startsWith(needle)
    ) {
      return at;
    }
  }

  return -1;
};

const useOutsideClose = (
  open: boolean,
  close: () => void,
  root: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>
): void => {
  useEffect(() => {
    if (!open) {
      return;
    }

    const inside = (target: EventTarget | null): boolean =>
      target instanceof Node &&
      (Boolean(root.current?.contains(target)) ||
        Boolean(panel.current?.contains(target)));

    const spot = (): string => {
      const box = root.current?.getBoundingClientRect();

      return box ? `${box.top},${box.left}` : "";
    };

    const openedAt = spot();

    const onDown = (event: MouseEvent): void => {
      if (!inside(event.target)) {
        close();
      }
    };

    const onScroll = (event: Event): void => {
      if (!inside(event.target) && spot() !== openedAt) {
        close();
      }
    };

    document.addEventListener("mousedown", onDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);

    return (): void => {
      document.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close, root, panel]);
};

const openKey = (key: string): boolean =>
  key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ";

const UiSelect = <OptionValue extends string>(
  props: Props<OptionValue>
): ReactElement => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [style, setStyle] = useState<CSSProperties>(HIDDEN);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const typed = useRef({ at: 0, text: "" });
  const listId = useId();

  const current = props.options.findIndex(
    (option) => option.value === props.value
  );

  const close = useCallback(() => {
    setOpen(false);
    setStyle(HIDDEN);
  }, []);

  useOutsideClose(open, close, root, panel);

  useLayoutEffect(() => {
    if (!open || !button.current || !panel.current) {
      return;
    }

    const placed = placeFixed(button.current, panel.current, {
      align: "start",
    });

    setStyle({ ...placed, minWidth: button.current.offsetWidth });
    panel.current
      .querySelector("[data-active]")
      ?.scrollIntoView({ block: "nearest" });
  }, [open]);

  useEffect(() => {
    if (open) {
      panel.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active]);

  const show = (): void => {
    setActive(
      current !== -1 && !props.options[current]?.disabled
        ? current
        : edge(props.options, false)
    );
    setOpen(true);
  };

  const pick = (index: number): void => {
    const option = props.options[index];

    if (!option || option.disabled) {
      return;
    }

    close();
    button.current?.focus();

    if (option.value !== props.value) {
      props.onChange(option.value);
    }
  };

  const find = (key: string): number => {
    const now = Date.now();
    const text = now - typed.current.at < 700 ? typed.current.text + key : key;
    typed.current = { at: now, text };

    return typeahead(
      props.options,
      text.length > 1 ? active - 1 : active,
      text
    );
  };

  const moveFor = (key: string): number | null => {
    if (key === "ArrowDown") {
      return step(props.options, active, 1);
    }

    if (key === "ArrowUp") {
      return step(props.options, active, -1);
    }

    if (key === "Home" || key === "PageUp") {
      return edge(props.options, false);
    }

    if (key === "End" || key === "PageDown") {
      return edge(props.options, true);
    }

    return null;
  };

  const onOpenKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "Escape") {
      close();

      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      pick(active);

      return;
    }

    const next =
      moveFor(event.key) ?? (event.key.length === 1 ? find(event.key) : null);

    if (next !== null && next >= 0) {
      setActive(next);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "Tab") {
      if (open) {
        close();
      }

      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const printable = event.key.length === 1;

    if (!open && !openKey(event.key) && !printable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (open) {
      return onOpenKey(event);
    }

    if (openKey(event.key)) {
      return show();
    }

    const hit = find(event.key);

    if (hit >= 0 && props.options[hit]) {
      props.onChange(props.options[hit].value);
    }
  };

  const label =
    current === -1 ? props.placeholder : props.options[current]?.label;

  const activeId = open && active >= 0 ? `${listId}-${active}` : undefined;

  return (
    <span ref={root} className={`ui-select-root ${props.className ?? ""}`}>
      <button
        ref={button}
        id={props.id}
        type="button"
        role="combobox"
        className={`ui-select${props.size === "sm" ? " sm" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeId}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        disabled={props.disabled}
        data-tip={open ? undefined : props.tip}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
      >
        {props.icon}
        <span
          className={`ui-select-value truncate${current === -1 ? " placeholder" : ""}`}
        >
          {label ?? ""}
        </span>
        <Icon name="chevronDown" size={12} />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={listId}
            className="ui-menu ui-select-menu"
            role="listbox"
            aria-label={props["aria-label"]}
            aria-labelledby={props["aria-labelledby"]}
            style={style}
          >
            {props.options.map((option, index) => (
              <div
                key={option.value}
                id={`${listId}-${index}`}
                data-index={index}
                data-active={index === active ? "" : undefined}
                role="option"
                aria-selected={option.value === props.value}
                aria-disabled={option.disabled || undefined}
                className="ui-menu-item"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => !option.disabled && setActive(index)}
                onClick={() => pick(index)}
              >
                <span className="truncate">{option.label}</span>
              </div>
            ))}
          </div>,
          button.current?.closest("dialog") ?? document.body
        )}
    </span>
  );
};

type UiSelectProps<OptionValue extends string> = Props<OptionValue>;

export { UiSelect };

export type { UiSelectOption, UiSelectProps };
