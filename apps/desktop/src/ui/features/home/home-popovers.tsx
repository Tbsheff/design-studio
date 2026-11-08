import { RUN_LEVELS } from "@design-studio/contracts";
import type { PackSummary, RunLevel } from "@design-studio/contracts";
import { Icon, useFitPopover, usePopover } from "@design-studio/ui";
import { useCallback, useEffect, useRef } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

import { VariationsControl } from "../canvas/variations-control.js";
import {
  ChoiceItem,
  levelGist,
  levelHint,
  levelLabel,
} from "../chat/level-control.js";
import { MODEL_OPTIONS } from "../chat/settings-draft-model.js";
import { fontStack, loadPackFonts } from "../design-system/packs.js";
import type { PacksState } from "../design-system/packs.js";
import type { RunMode } from "./app-chip-model.js";
import { copy } from "./copy.js";
import type { DesignCount } from "./home-model.js";
import { NoneCard } from "./none-card.js";
import { toClassName } from "./project-card-model.js";

import "../../styles/attach-app.css";

const ROW_ICON_SIZE = 14;

type Close = (refocus: boolean) => void;

const FOCUS_ITEMS =
  ".ui-menu-item:not(:disabled), .home-pack-card:not(:disabled), .btn:not(:disabled)";

const moveFocus = (
  event: KeyboardEvent<HTMLElement>,
  selector: string
): void => {
  const items = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(selector),
  ];

  const at = items.indexOf(document.activeElement as HTMLElement);

  const next =
    event.key === "ArrowDown"
      ? at + 1
      : event.key === "ArrowUp"
        ? at - 1
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : null;

  if (next === null || items.length === 0) {
    return;
  }

  event.preventDefault();
  items[(next + items.length) % items.length]?.focus();
};

const Pop = ({
  trigger,
  onClose,
  variant,
  label,
  role = "dialog",
  children,
  onKeyDown,
  closing = false,
}: {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: Close;
  readonly variant: string;
  readonly label: string;
  readonly role?: "dialog" | "menu";
  readonly children: ReactNode;
  readonly onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly closing?: boolean | undefined;
}) => {
  const root = useRef<HTMLDivElement>(null);
  usePopover(!closing, root, onClose, trigger);
  useFitPopover(root, trigger, true);
  useEffect(() => {
    const first =
      root.current?.querySelector<HTMLElement>(
        '[aria-checked="true"], [aria-pressed="true"]'
      ) ?? root.current?.querySelector<HTMLElement>(FOCUS_ITEMS);

    first?.focus();
  }, []);

  return (
    <div
      ref={root}
      className={`ui-popover home-pop ${variant}`}
      role={role}
      aria-label={label}
      data-closing={closing || undefined}
      inert={closing || undefined}
      onKeyDown={(event) => {
        if (event.key === "Tab" && role === "menu") {
          event.preventDefault();
          onClose(true);
        }

        onKeyDown?.(event);
      }}
    >
      {children}
    </div>
  );
};

function swatch(pack: PackSummary, name: string, fallback: string): string {
  return pack.swatches.find((item) => item.name === name)?.value ?? fallback;
}

const RAMP = [6, 16, 30, 48, 68, 100, 72, 48];

function packVars(pack: PackSummary): CSSProperties {
  return {
    "--pc-accent": swatch(pack, "accent", "#888"),
    "--pc-bg": swatch(pack, "bg", "#fff"),
    "--pc-body": fontStack(pack.fonts.body, "var(--font)"),
    "--pc-border": swatch(pack, "border", "#ddd"),
    "--pc-display": fontStack(pack.fonts.display, "var(--serif)"),
    "--pc-fg": swatch(pack, "fg", "#111"),
    "--pc-primary": swatch(pack, "primary", "#555"),
    "--pc-surface": swatch(pack, "surface", "#f5f5f5"),
  } as CSSProperties;
}

function rampColor(step: number, index: number): string {
  return index <= 5
    ? `color-mix(in oklch, var(--pc-primary) ${step}%, var(--pc-bg))`
    : `color-mix(in oklch, var(--pc-primary) ${step}%, var(--pc-fg))`;
}

function fontNames(pack: PackSummary): string {
  const clean = (family: string): string =>
    family.split(",")[0]?.replaceAll(/['"]/g, "").trim() ?? "";

  const display = clean(pack.fonts.display);
  const body = clean(pack.fonts.body);

  return display === body || !body ? display : `${display} / ${body}`;
}

const PackPreviewCard = ({
  pack,
  isSelected,
  onPick,
}: {
  readonly pack: PackSummary;
  readonly isSelected: boolean;
  readonly onPick: () => void;
}) => (
  <button
    type="button"
    className="home-pack-card"
    aria-pressed={isSelected}
    data-pack-id={pack.id}
    onClick={onPick}
  >
    <span className="home-pack-face" style={packVars(pack)} aria-hidden="true">
      <span className="pc-fonts">{fontNames(pack)}</span>
      <span className="pc-name">{pack.name}</span>
      <span className="pc-ramp">
        {RAMP.map((step, index) => (
          <span key={index} style={{ background: rampColor(step, index) }} />
        ))}
      </span>
      <span className="pc-sample">
        <span className="pc-sample-card">
          <span className="pc-sample-text">{copy.theQuickBrownFoxJumps}</span>
          <span className="pc-btn">{copy.continue2}</span>
        </span>
        <span className="pc-image" />
      </span>
    </span>
    <span className="home-pack-label truncate">{pack.name}</span>
  </button>
);

const PackCards = ({
  packs,
  value,
  shouldIncludeNone,
  onPick,
}: {
  readonly packs: PackSummary[];
  readonly value: string | null;
  readonly shouldIncludeNone: boolean;
  readonly onPick: (pack: PackSummary | null) => void;
}) => {
  useEffect(() => loadPackFonts(packs), [packs]);

  return (
    <div className="home-pack-grid">
      {shouldIncludeNone && (
        <NoneCard isSelected={value === null} onPick={() => onPick(null)} />
      )}
      {packs.map((pack) => (
        <PackPreviewCard
          key={pack.id}
          pack={pack}
          isSelected={pack.id === value}
          onPick={() => onPick(pack)}
        />
      ))}
    </div>
  );
};

const PackPopover = ({
  trigger,
  onClose,
  state,
  value,
  onChange,
  onNew,
  isClosing,
}: {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: Close;
  readonly state: PacksState;
  readonly value: string | null;
  readonly onChange: (id: string | null) => void;
  readonly onNew: () => void;
  readonly isClosing: boolean;
}) => (
  <Pop
    trigger={trigger}
    closing={isClosing}
    onClose={onClose}
    variant="home-pack-pop"
    label="Design system"
    onKeyDown={(event) => moveFocus(event, FOCUS_ITEMS)}
  >
    <p className="home-pop-lede">{copy.setUpADesignSystem}</p>
    <button type="button" className="btn strong home-pop-cta" onClick={onNew}>
      {copy.setUpYourDesignSystem}
    </button>
    {state.error && (
      <div className="alert error small">
        {copy.couldNotLoadDesignSystems}
        {state.error}
      </div>
    )}
    <PackCards
      packs={state.packs ?? []}
      value={value}
      shouldIncludeNone
      onPick={(pack) => {
        onChange(pack?.id ?? null);
        onClose(true);
      }}
    />
  </Pop>
);

interface ModelSettings {
  readonly model: string;
  readonly onModel: (model: string) => void;
  readonly level: RunLevel;
  readonly onLevel: (level: RunLevel) => void;
  readonly designs: DesignCount;
  readonly onMore: () => void;
}

const ModelPopover = ({
  trigger,
  onClose,
  settings,
  isClosing,
}: {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: Close;
  readonly settings: ModelSettings;
  readonly isClosing: boolean;
}) => (
  <Pop
    trigger={trigger}
    closing={isClosing}
    onClose={onClose}
    variant="home-model-pop"
    label="Model and run settings"
  >
    <div
      className="ui-menu-section"
      role="radiogroup"
      aria-label={copy.model}
      onKeyDown={(event) => moveFocus(event, ".ui-menu-item")}
    >
      <span className="ui-menu-label">{copy.model}</span>
      {MODEL_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          className="ui-menu-item"
          aria-checked={settings.model === option.id}
          tabIndex={settings.model === option.id ? 0 : -1}
          onClick={() => settings.onModel(option.id)}
        >
          {option.label.replace(/^Claude /, "")}
        </button>
      ))}
    </div>
    <div className="ui-menu-section home-pop-group">
      <span className="ui-menu-label" id="home-designs-label">
        {copy.designs}
      </span>
      <VariationsControl
        value={settings.designs.value}
        max={settings.designs.max}
        onChange={settings.designs.onChange}
        labelledBy="home-designs-label"
      />
      <p className="home-pop-hint">
        {settings.designs.value > 1
          ? `Create makes ${settings.designs.value} designs side by side.`
          : `Pick 2 to ${settings.designs.max} to compare options.`}
      </p>
    </div>
    <div className="ui-menu-section">
      <button
        type="button"
        className="ui-menu-item"
        onClick={() => {
          onClose(false);
          settings.onMore();
        }}
      >
        <Icon name="sliders" size={14} />
        {copy.skillsLimitsAndDesignMd}
      </button>
    </div>
  </Pop>
);

const LevelPopover = ({
  trigger,
  onClose,
  level,
  onLevel,
  isClosing,
}: {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: Close;
  readonly level: RunLevel;
  readonly onLevel: (level: RunLevel) => void;
  readonly isClosing: boolean;
}) => (
  <Pop
    trigger={trigger}
    closing={isClosing}
    onClose={onClose}
    variant="home-level-pop"
    label="Level"
    role="menu"
    onKeyDown={(event) => moveFocus(event, ".ui-menu-item")}
  >
    <div className="ui-menu-section" role="group" aria-label={copy.level}>
      <span className="ui-menu-label">{copy.level}</span>
      {RUN_LEVELS.map((item) => (
        <ChoiceItem
          key={item}
          label={levelLabel(item)}
          hint={levelGist(item).hint}
          meta={levelGist(item).cost}
          full={levelHint(item)}
          checked={level === item}
          focusable
          onPick={() => {
            onLevel(item);
            onClose(true);
          }}
        />
      ))}
    </div>
  </Pop>
);

interface ModeButtonProps {
  readonly mode: RunMode;
  readonly current: RunMode;
  readonly label: string;
  readonly onSelect: (mode: RunMode) => void;
}

const ModeButton = ({
  mode,
  current,
  label,
  onSelect,
}: ModeButtonProps): ReactElement => {
  const select = useCallback((): void => {
    onSelect(mode);
  }, [mode, onSelect]);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={mode === current}
      className={toClassName(mode === current && "on")}
      onClick={select}
    >
      {label}
    </button>
  );
};

interface AppCandidateRowProps {
  readonly appDir: string;
  readonly name: string;
  readonly isChosen: boolean;
  readonly onPick: (appDir: string) => void;
}

const AppCandidateRow = ({
  appDir,
  name,
  isChosen,
  onPick,
}: AppCandidateRowProps): ReactElement => {
  const pick = useCallback((): void => {
    onPick(appDir);
  }, [appDir, onPick]);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChosen}
      className="ui-menu-item"
      onClick={pick}
    >
      {isChosen && <Icon name="check" size={ROW_ICON_SIZE} />}
      {!isChosen && <Icon name="code" size={ROW_ICON_SIZE} />}
      <span className="truncate mono">{appDir}</span>
      <span className="ui-menu-meta truncate">{name}</span>
    </button>
  );
};

export {
  AppCandidateRow,
  LevelPopover,
  ModeButton,
  ModelPopover,
  PackCards,
  PackPopover,
  PackPreviewCard,
  Pop,
  moveFocus,
};

export type { Close, ModelSettings };
