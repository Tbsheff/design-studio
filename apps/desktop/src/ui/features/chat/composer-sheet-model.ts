type ComposerSheet = "skills";

interface ComposerSheetState {
  readonly close: () => void;
  readonly open: ComposerSheet | null;
  readonly show: (sheet: ComposerSheet) => void;
}

interface PlusProjectProps {
  readonly onSkillList: () => void;
  readonly skillsCount: string | null;
}

export type { ComposerSheet, ComposerSheetState, PlusProjectProps };
