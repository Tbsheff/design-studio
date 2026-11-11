type ComposerSheet = "budget" | "data" | "skills";

interface ComposerSheetState {
  readonly close: () => void;
  readonly open: ComposerSheet | null;
  readonly show: (sheet: ComposerSheet) => void;
}

interface PlusProjectProps {
  readonly budgetLabel: string;
  readonly onBudget: () => void;
  readonly onDataUse: () => void;
  readonly onSkillList: () => void;
  readonly skillsCount: string | null;
}

export type { ComposerSheet, ComposerSheetState, PlusProjectProps };
