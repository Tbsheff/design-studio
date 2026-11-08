import type { PackSummary, RunLevel } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback, useEffect } from "react";
import type { ReactElement } from "react";

import { VariationsControl } from "../canvas/variations-control.js";
import {
  ChoiceItem,
  levelGist,
  levelHint,
  levelLabel,
} from "../chat/level-control.js";
import { fontStack, loadPackFonts } from "../design-system/packs.js";
import type { RunMode } from "./app-chip-model.js";
import { NoneCard } from "./none-card.js";
import { toPackVars } from "./pack-face-model.js";
import { PackPreviewCard } from "./pack-preview-card.js";
import { toClassName } from "./project-card-model.js";

const ROW_ICON_SIZE = 14;

const MODEL_PREFIX = /^Claude /u;

interface PackCardsProps {
  readonly packs: PackSummary[];
  readonly value: string | null;
  readonly shouldIncludeNone: boolean;
  readonly onPick: (pack: PackSummary | null) => void;
}

const PackCards = ({
  packs,
  value,
  shouldIncludeNone,
  onPick,
}: PackCardsProps): ReactElement => {
  useEffect(() => loadPackFonts(packs), [packs]);

  const pickNone = useCallback((): void => {
    onPick(null);
  }, [onPick]);

  return (
    <div className="home-pack-grid">
      {shouldIncludeNone && (
        <NoneCard isSelected={value === null} onPick={pickNone} />
      )}
      {packs.map((pack) => (
        <PackPreviewCard
          key={pack.id}
          pack={pack}
          isSelected={pack.id === value}
          faceStyle={toPackVars(pack, fontStack)}
          onPick={onPick}
        />
      ))}
    </div>
  );
};

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

interface ModelOptionProps {
  readonly id: string;
  readonly label: string;
  readonly isChosen: boolean;
  readonly onModel: (id: string) => void;
}

const toTabIndex = (isChosen: boolean): number => {
  if (isChosen) {
    return 0;
  }

  return -1;
};

const ModelOption = ({
  id,
  label,
  isChosen,
  onModel,
}: ModelOptionProps): ReactElement => {
  const pick = useCallback((): void => {
    onModel(id);
  }, [id, onModel]);

  return (
    <button
      type="button"
      role="radio"
      className="ui-menu-item"
      aria-checked={isChosen}
      tabIndex={toTabIndex(isChosen)}
      onClick={pick}
    >
      {label.replace(MODEL_PREFIX, "")}
    </button>
  );
};

interface LevelChoiceProps {
  readonly item: RunLevel;
  readonly level: RunLevel;
  readonly onLevel: (level: RunLevel) => void;
  readonly onClose: (refocus: boolean) => void;
}

const LevelChoice = ({
  item,
  level,
  onLevel,
  onClose,
}: LevelChoiceProps): ReactElement => {
  const pick = useCallback((): void => {
    onLevel(item);
    onClose(true);
  }, [item, onClose, onLevel]);

  return (
    <ChoiceItem
      label={levelLabel(item)}
      hint={levelGist(item).hint}
      meta={levelGist(item).cost}
      full={levelHint(item)}
      checked={level === item}
      focusable
      onPick={pick}
    />
  );
};

export {
  AppCandidateRow,
  LevelChoice,
  ModeButton,
  ModelOption,
  PackCards,
  VariationsControl,
};
