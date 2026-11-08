import { RUN_LEVELS } from "@design-studio/contracts";
import type { RunLevel } from "@design-studio/contracts";
import { Icon, usePopover } from "@design-studio/ui";
import {
  useEffect,
  useId,
  useRef,
  useCallback,
  useLayoutEffect,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "../../ai/lib/utils.js";
import { ChoiceItem } from "./choice-item.js";
import { ITEM, MODES, MODE_SHORT_HINT } from "./composer-menu-model.js";
import type {
  ItemProps,
  ModelPillProps,
  PlusMenuProps,
  UsePlacedPopoverResult,
} from "./composer-menu-model.js";
import { copy } from "./copy.js";
import { DesignCounts } from "./design-counts.js";
import { levelGist, levelHint, levelLabel } from "./level-model.js";
import { MenuItem } from "./menu-item.js";
import { ModelName } from "./model-name.js";
import { PillCaret } from "./pill-caret.js";
import {
  MODE_HINT,
  designsHint,
  EFFORT_HINT,
  UNPLACED,
  placeAboveOrBelow,
  MODE_LABEL,
  EffortToggle,
} from "./run-settings.js";
import { MODEL_OPTIONS } from "./settings-draft-model.js";
import { effectiveModel, shortModel } from "./slash-groups.js";
import { StableText } from "./stable-text.js";
import { usePresence } from "./use-presence.js";
import { useRovingRadioGroup } from "./use-roving-radio-group.js";

const MenuSection = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement => {
  const id = useId();

  return (
    <div className="ui-menu-section" role="group" aria-labelledby={id}>
      <span className="ui-menu-label" id={id}>
        {label}
      </span>
      {children}
    </div>
  );
};

const menuKeys = (
  event: KeyboardEvent<HTMLDivElement>,
  close: (refocus: boolean) => void
): void => {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(ITEM)];

  const at = items.indexOf(document.activeElement as HTMLElement);

  let step: 0 | 1 | -1 = 0;

  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    step = 1;
  } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    step = -1;
  }

  if (step !== 0) {
    event.preventDefault();
    items[(at + step + items.length) % items.length]?.focus();
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    items[event.key === "Home" ? 0 : items.length - 1]?.focus();
  } else if (event.key === "Tab") {
    event.preventDefault();
    close(true);
  }
};

const toPanelProps = (menu: { closing: boolean; style: CSSProperties }) => ({
  "data-closing": menu.closing || undefined,
  inert: menu.closing || undefined,
  style: menu.style,
});

const usePlacedPopover = (
  trigger: RefObject<HTMLButtonElement | null>,
  panel: RefObject<HTMLDivElement | null>
): UsePlacedPopoverResult => {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>(UNPLACED);
  const presence = usePresence(open ? true : null);

  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false);

      if (refocus) {
        trigger.current?.focus();
      }
    },
    [trigger]
  );

  usePopover(open, panel, close, trigger);
  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const place = (): void => {
      if (trigger.current && panel.current) {
        setStyle(placeAboveOrBelow(trigger.current, panel.current));
      }
    };

    place();
    window.addEventListener("resize", place);
    const observer = new ResizeObserver(place);

    if (panel.current) {
      observer.observe(panel.current);
    }

    return (): void => {
      window.removeEventListener("resize", place);
      observer.disconnect();
    };
  }, [open, trigger, panel]);

  const show = (): void => {
    setStyle(UNPLACED);
    setOpen(true);
  };

  return {
    close,
    closing: presence.closing,
    open,
    shown: presence.shown !== null,
    style,
    toggle: (): void => {
      if (open) {
        return close(false);
      }

      return show();
    },
  };
};

const PlusMenu = (props: PlusMenuProps): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  useEffect(() => {
    if (menu.open) {
      panel.current?.querySelector<HTMLElement>(ITEM)?.focus();
    }
  }, [menu.open]);

  const act = (run: () => void) => (): void => {
    menu.close(false);
    run();
  };

  const { designs } = props;
  const countsId = useId();

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="icon-btn small bordered composer-plus"
        aria-label={copy.addAndSettings}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        data-testid="composer-plus"
        data-tip={copy.attachMentionSkills}
        data-tip-side="top"
        data-tip-align="start"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => {
          if (!menu.open) {
            props.onOpen?.();
          }

          menu.toggle();
        }}
      >
        <Icon name="plus" size={16} />
      </button>
      {menu.shown &&
        createPortal(
          <div
            tabIndex={0}
            ref={panel}
            className="ui-menu composer-menu"
            role="menu"
            aria-label={copy.addAndSettings}
            {...toPanelProps(menu)}
            onKeyDown={(event) => menuKeys(event, menu.close)}
          >
            <MenuSection label="Add">
              <MenuItem
                icon="paperclip"
                label="Attach image"
                onPick={act(props.onAttach)}
              />
              <MenuItem
                icon="file"
                label="Mention a file or token"
                meta="@"
                onPick={act(props.onMention)}
              />
              <MenuItem
                icon="book"
                label="Skills and commands"
                meta="/"
                onPick={act(props.onSkills)}
              />
            </MenuSection>
            <MenuSection label="Mode">
              {MODES.map((mode) => (
                <ChoiceItem
                  key={mode}
                  label={MODE_LABEL[mode]}
                  hint={MODE_SHORT_HINT[mode]}
                  full={MODE_HINT[mode]}
                  checked={props.mode === mode}
                  onPick={() => props.onMode(mode)}
                />
              ))}
            </MenuSection>
            {designs && (
              <MenuSection label="Designs side by side">
                <DesignCounts countsId={countsId} designs={designs} />
              </MenuSection>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

const LevelPill = ({
  level,
  onLevel,
  onOpen,
}: {
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
  onOpen?: () => void;
}): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  useEffect(() => {
    if (menu.open) {
      (
        panel.current?.querySelector<HTMLElement>('[aria-checked="true"]') ??
        panel.current?.querySelector<HTMLElement>(ITEM)
      )?.focus();
    }
  }, [menu.open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="ui-pill-select inline composer-pill"
        data-testid="level-pill"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`Level: ${levelLabel(level)}`}
        onClick={() => {
          if (!menu.open) {
            onOpen?.();
          }

          menu.toggle();
        }}
      >
        <span className="ui-pill-select-label">{copy.level}</span>
        <span className="ui-pill-select-value">
          <StableText
            sizes={RUN_LEVELS.map((runLevel) => ({
              key: levelLabel(runLevel),
              node: levelLabel(runLevel),
            }))}
          >
            {levelLabel(level)}
          </StableText>
        </span>
        <PillCaret />
      </button>
      {menu.shown &&
        createPortal(
          <div
            tabIndex={0}
            ref={panel}
            className="ui-menu composer-menu level-menu"
            role="menu"
            aria-label={copy.level}
            {...toPanelProps(menu)}
            onKeyDown={(event) => menuKeys(event, menu.close)}
          >
            <MenuSection label="Level">
              {RUN_LEVELS.map((item) => (
                <ChoiceItem
                  key={item}
                  label={levelLabel(item)}
                  hint={levelGist(item).hint}
                  meta={levelGist(item).cost}
                  full={levelHint(item)}
                  checked={level === item}
                  onPick={() => {
                    onLevel(item);
                    menu.close(true);
                  }}
                />
              ))}
            </MenuSection>
          </div>,
          document.body
        )}
    </>
  );
};

const ModelToggle = ({
  value,
  onChange,
  locked,
}: {
  value: string;
  onChange: (id: string) => void;
  locked: boolean;
}): ReactElement => {
  const ids = MODEL_OPTIONS.map((option) => option.id);
  const known = ids.includes(value);

  const radios = useRovingRadioGroup<string>(
    ids,
    known ? value : (ids[0] ?? ""),
    onChange,
    () => locked
  );

  return (
    <div
      tabIndex={0}
      className="segmented"
      role="radiogroup"
      aria-label={copy.model}
      onKeyDown={radios.onKeyDown}
    >
      {MODEL_OPTIONS.map((option) => (
        <button
          key={option.id}
          {...radios.item(option.id)}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          disabled={locked}
          className={cn(value === option.id && "on")}
          onClick={() => onChange(option.id)}
        >
          {shortModel(option.id)}
        </button>
      ))}
    </div>
  );
};

const ModelPill = ({
  model,
  level,
  effort,
  onModel,
  onOpen,
}: ModelPillProps): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pop = usePlacedPopover(trigger, panel);
  const id = useId();
  const shown = effectiveModel(model, level);
  const locked = shown !== model;
  const choice = effort.value ?? "auto";
  useEffect(() => {
    if (pop.open) {
      panel.current
        ?.querySelector<HTMLElement>('[tabindex="0"]:not(:disabled)')
        ?.focus();
    }
  }, [pop.open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="ui-pill-select inline composer-pill model-pill"
        data-testid="run-settings"
        aria-label={`Model: ${shortModel(shown)}`}
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        onClick={() => {
          if (!pop.open) {
            onOpen?.();
          }

          pop.toggle();
        }}
      >
        <span className="ui-pill-select-label">{copy.model}</span>
        <span
          className="ui-pill-select-value model-pill-name"
          data-testid="active-model"
        >
          <StableText
            sizes={MODEL_OPTIONS.map((option) => ({
              key: option.id,
              node: <ModelName name={shortModel(option.id)} />,
            }))}
          >
            <ModelName name={shortModel(shown)} />
          </StableText>
        </span>
        <PillCaret />
      </button>
      {pop.shown &&
        createPortal(
          <div
            className="run-settings-pop"
            ref={panel}
            {...toPanelProps(pop)}
            role="dialog"
            aria-label={copy.modelAndEffort}
            data-testid="run-settings-popover"
          >
            <section className="rs-group">
              <h3 className="rs-label">{copy.model}</h3>
              <ModelToggle value={shown} onChange={onModel} locked={locked} />
              <p className="rs-hint">
                {locked &&
                  `${levelLabel(level)} runs always use ${shortModel(shown)}. Pick another level in the Level menu to change the model.`}
                {!locked && "Saved for this project."}
              </p>
            </section>
            <section className="rs-group">
              <h3 className="rs-label">{copy.effort}</h3>
              <EffortToggle effort={effort} hintId={`${id}-effort-hint`} />
              <p className="rs-hint" id={`${id}-effort-hint`}>
                {EFFORT_HINT[choice]}
              </p>
            </section>
          </div>,
          document.body
        )}
    </>
  );
};

export { LevelPill, MODE_SHORT_HINT, ModelPill, PlusMenu };
