import type { DecisionWire } from "@design-studio/actions/run/decision/schema";
import { routes } from "@design-studio/actions/run/routes";
import { routes as themeRoutes } from "@design-studio/actions/theme/routes";
import { useCallback, useMemo, useState, useTransition } from "react";
import type {
  ChangeEvent,
  KeyboardEvent,
  RefObject,
  TransitionStartFunction,
} from "react";

import { useAction } from "../../platform/query.js";
import type { ActionState } from "../../platform/query.js";
import { useUi } from "../../platform/storage.js";
import type { UsePlacedPopoverResult } from "./composer-menu-model.js";
import { LEVEL_FOCUS } from "./composer-menu-model.js";
import { copy } from "./copy.js";
import {
  DECISION_PAGE_LIMIT,
  isShownOption,
  toOtherText,
} from "./decision-row-model.js";
import type { RunView } from "./run-state-model.js";
import { useFocusOnOpen } from "./use-focus-on-open.js";
import { useMenuToggle } from "./use-menu-toggle.js";
import { usePlacedPopover } from "./use-placed-popover.js";

type PickDecision = (decisionId: string, option: string) => void;

interface DecisionRowState {
  readonly decisions: readonly DecisionWire[];
  readonly error: string | null;
  readonly isPending: boolean;
  readonly onPick: PickDecision;
}

interface DecisionChipState {
  readonly handleOption: (option: string) => void;
  readonly handleOther: () => void;
  readonly handleOtherCancel: () => void;
  readonly handleToggle: () => void;
  readonly isOtherOpen: boolean;
  readonly menu: UsePlacedPopoverResult;
}

interface LookPickState {
  readonly decisions: readonly DecisionWire[];
  readonly error: string | null;
  readonly onLookPick: (decisionId: string, option: string) => boolean;
}

interface DecisionOtherState {
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleSubmit: () => void;
  readonly value: string;
}

const NO_DECISIONS: readonly DecisionWire[] = [];

const THEME_PAGE_LIMIT = 20;

const isLookDecision = (decision: DecisionWire): boolean =>
  decision.topic === copy.decisionLook;

const toLookDecisions = (
  items: readonly DecisionWire[],
  isRunning: boolean,
  lookPick: string | null
): readonly DecisionWire[] =>
  items.flatMap((decision) => {
    if (!isLookDecision(decision)) {
      return [decision];
    }

    if (isRunning) {
      return [];
    }

    return [{ ...decision, picked: lookPick ?? decision.picked }];
  });

const useLookThemes = (
  run: RunView,
  projectId: string | null,
  decisions: readonly DecisionWire[]
): ActionState<typeof themeRoutes.listTheme> => {
  const { directionId } = run;
  const hasLook = decisions.some((decision) => isLookDecision(decision));

  const input = useMemo(() => {
    if (!hasLook || projectId === null || directionId === null) {
      return null;
    }

    const cursor = null;
    const limit = THEME_PAGE_LIMIT;

    return { cursor, directionId, limit, projectId };
  }, [directionId, hasLook, projectId]);

  return useAction(themeRoutes.listTheme, input);
};

const useLookPick = (
  run: RunView,
  projectId: string | null,
  items: readonly DecisionWire[],
  startTransition: TransitionStartFunction
): LookPickState => {
  const { directionId } = run;
  const [lookPick, setLookPick] = useState<string | null>(null);
  const applier = useAction(themeRoutes.applyTheme);
  const { run: applyTheme } = applier;
  const themes = useLookThemes(run, projectId, items);

  const decisions = useMemo(
    () => toLookDecisions(items, run.status === "running", lookPick),
    [items, lookPick, run.status]
  );

  const onLookPick = useCallback(
    (decisionId: string, option: string): boolean => {
      const decision = decisions.find((item) => item.id === decisionId);

      const theme =
        themes.data?.items.find((item) => item.name === option) ?? null;

      if (!decision || !isLookDecision(decision) || theme === null) {
        return false;
      }

      if (
        projectId === null ||
        directionId === null ||
        isShownOption(decision, option)
      ) {
        return true;
      }

      const lookIds = { directionId, projectId, themeId: theme.id };

      startTransition(async () => {
        const applied = await applyTheme(lookIds);

        if (applied !== null) {
          setLookPick(option);
        }
      });

      return true;
    },
    [
      applyTheme,
      decisions,
      directionId,
      projectId,
      startTransition,
      themes.data,
    ]
  );

  const error = applier.error?.message ?? null;

  return { decisions, error, onLookPick };
};

const useDecisionRow = (run: RunView): DecisionRowState => {
  const { activeProjectId } = useUi();
  const { hasStarted, runId } = run;
  const [isPending, startTransition] = useTransition();

  const input = useMemo(() => {
    if (!hasStarted || activeProjectId === null) {
      return null;
    }

    const cursor = null;
    const limit = DECISION_PAGE_LIMIT;
    const projectId = activeProjectId;

    return { cursor, limit, projectId, runId };
  }, [activeProjectId, hasStarted, runId]);

  const read = useAction(routes.listDecisionsRun, input);
  const setter = useAction(routes.setDecisionRun);
  const { run: setDecision } = setter;
  const items = read.data?.items ?? NO_DECISIONS;

  const look = useLookPick(run, activeProjectId, items, startTransition);
  const { onLookPick } = look;

  const onPick = useCallback(
    (decisionId: string, option: string): void => {
      if (activeProjectId === null || onLookPick(decisionId, option)) {
        return;
      }

      const projectId = activeProjectId;

      startTransition(async () => {
        await setDecision({ decisionId, option, projectId, runId });
      });
    },
    [activeProjectId, onLookPick, runId, setDecision]
  );

  return {
    decisions: look.decisions,
    error: setter.error?.message ?? look.error,
    isPending,
    onPick,
  };
};

const useDecisionChip = (
  trigger: RefObject<HTMLButtonElement | null>,
  panel: RefObject<HTMLDivElement | null>,
  decisionId: string,
  onPick: PickDecision
): DecisionChipState => {
  const menu = usePlacedPopover(trigger, panel);
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  const { close } = menu;

  const onOpen = useCallback((): void => {
    setIsOtherOpen(false);
  }, []);

  const handleToggle = useMenuToggle(menu, onOpen);
  useFocusOnOpen(menu.open, panel, LEVEL_FOCUS);

  const handleOption = useCallback(
    (option: string): void => {
      close(true);
      onPick(decisionId, option);
    },
    [close, decisionId, onPick]
  );

  const handleOther = useCallback((): void => {
    setIsOtherOpen(true);
  }, []);

  const handleOtherCancel = useCallback((): void => {
    setIsOtherOpen(false);
  }, []);

  return {
    handleOption,
    handleOther,
    handleOtherCancel,
    handleToggle,
    isOtherOpen,
    menu,
  };
};

const useDecisionOther = (
  onSubmit: (option: string) => void,
  onCancel: () => void
): DecisionOtherState => {
  const [value, setValue] = useState("");

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setValue(event.target.value);
    },
    []
  );

  const handleSubmit = useCallback((): void => {
    const text = toOtherText(value);

    if (text !== null) {
      onSubmit(text);
    }
  }, [onSubmit, value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();

        return;
      }

      event.stopPropagation();

      if (event.key === "Enter") {
        event.preventDefault();
        handleSubmit();
      }
    },
    [onCancel, handleSubmit]
  );

  return { handleChange, handleKeyDown, handleSubmit, value };
};

export { useDecisionChip, useDecisionOther, useDecisionRow };

export type { DecisionChipState, DecisionRowState, PickDecision };
