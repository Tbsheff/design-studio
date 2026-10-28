import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { placeFixed } from "../popoverPlacement";
import { Icon } from "./Icon";

export interface UiSelectOption<V extends string = string> {
  value: V;
  label: string;
  disabled?: boolean;
}

interface Props<V extends string> {
  value: V;
  options: readonly UiSelectOption<V>[];
  onChange: (value: V) => void;
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
  top: 0,
  left: 0,
  opacity: 0,
  pointerEvents: "none",
};

function step(
  options: readonly UiSelectOption[],
  from: number,
  delta: 1 | -1,
): number {
  for (let i = 1; i <= options.length; i++) {
    const at = (from + delta * i + options.length * 2) % options.length;
    if (!options[at]?.disabled) return at;
  }
  return from;
}

function edge(options: readonly UiSelectOption[], last: boolean): number {
  const order = options.map((_, i) => i);
  if (last) order.reverse();
  return order.find((i) => !options[i]?.disabled) ?? -1;
}

function typeahead(
  options: readonly UiSelectOption[],
  from: number,
  query: string,
): number {
  const q = query.toLowerCase();
  for (let i = 1; i <= options.length; i++) {
    const at = (from + i) % options.length;
    const option = options[at];
    if (option && !option.disabled && option.label.toLowerCase().startsWith(q))
      return at;
  }
  return -1;
}

function useOutsideClose(
  open: boolean,
  close: () => void,
  root: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (!!root.current?.contains(target) || !!panel.current?.contains(target));
    const onDown = (e: MouseEvent) => {
      if (!inside(e.target)) close();
    };
    const onScroll = (e: Event) => {
      if (!inside(e.target)) close();
    };
    document.addEventListener("mousedown", onDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close, root, panel]);
}

function openKey(key: string): boolean {
  return (
    key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " "
  );
}

export function UiSelect<V extends string>(p: Props<V>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [style, setStyle] = useState<CSSProperties>(HIDDEN);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();
  const current = p.options.findIndex((o) => o.value === p.value);
  const close = useCallback(() => {
    setOpen(false);
    setStyle(HIDDEN);
  }, []);
  useOutsideClose(open, close, root, panel);

  useLayoutEffect(() => {
    if (!open || !button.current || !panel.current) return;
    const placed = placeFixed(button.current, panel.current, {
      align: "start",
    });
    setStyle({ ...placed, minWidth: button.current.offsetWidth });
    panel.current
      .querySelector("[data-active]")
      ?.scrollIntoView({ block: "nearest" });
  }, [open]);

  useEffect(() => {
    if (open)
      panel.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const show = () => {
    setActive(
      current >= 0 && !p.options[current]?.disabled
        ? current
        : edge(p.options, false),
    );
    setOpen(true);
  };

  const pick = (index: number) => {
    const option = p.options[index];
    if (!option || option.disabled) return;
    close();
    button.current?.focus();
    if (option.value !== p.value) p.onChange(option.value);
  };

  const find = (key: string): number => {
    const now = Date.now();
    const text = now - typed.current.at < 700 ? typed.current.text + key : key;
    typed.current = { text, at: now };
    return typeahead(p.options, text.length > 1 ? active - 1 : active, text);
  };

  const moveFor = (key: string): number | null => {
    if (key === "ArrowDown") return step(p.options, active, 1);
    if (key === "ArrowUp") return step(p.options, active, -1);
    if (key === "Home" || key === "PageUp") return edge(p.options, false);
    if (key === "End" || key === "PageDown") return edge(p.options, true);
    return null;
  };

  const onOpenKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      pick(active);
      return;
    }
    const next = moveFor(e.key) ?? (e.key.length === 1 ? find(e.key) : null);
    if (next !== null && next >= 0) setActive(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Tab") {
      if (open) close();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const printable = e.key.length === 1;
    if (!open && !openKey(e.key) && !printable) return;
    e.preventDefault();
    e.stopPropagation();
    if (open) return onOpenKey(e);
    if (openKey(e.key)) return show();
    const hit = find(e.key);
    if (hit >= 0 && p.options[hit]) p.onChange(p.options[hit].value);
  };

  const label = current >= 0 ? p.options[current]?.label : p.placeholder;
  const activeId = open && active >= 0 ? `${listId}-${active}` : undefined;
  return (
    <span ref={root} className={`ui-select-root ${p.className ?? ""}`}>
      <button
        ref={button}
        id={p.id}
        type="button"
        role="combobox"
        className={`ui-select${p.size === "sm" ? " sm" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeId}
        aria-label={p["aria-label"]}
        aria-labelledby={p["aria-labelledby"]}
        disabled={p.disabled}
        data-tip={open ? undefined : p.tip}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
      >
        {p.icon}
        <span
          className={`ui-select-value truncate${current < 0 ? " placeholder" : ""}`}
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
            aria-label={p["aria-label"]}
            aria-labelledby={p["aria-labelledby"]}
            style={style}
          >
            {p.options.map((option, index) => (
              <div
                key={option.value}
                id={`${listId}-${index}`}
                data-index={index}
                data-active={index === active ? "" : undefined}
                role="option"
                aria-selected={option.value === p.value}
                aria-disabled={option.disabled || undefined}
                className="ui-menu-item"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => !option.disabled && setActive(index)}
                onClick={() => pick(index)}
              >
                <span className="truncate">{option.label}</span>
              </div>
            ))}
          </div>,
          button.current?.closest("dialog") ?? document.body,
        )}
    </span>
  );
}
