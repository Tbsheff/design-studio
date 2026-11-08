import { useCallback } from "react";

interface DraftFields {
  allowBash: boolean;
  allowInstall: boolean;
  autoApprove: boolean;
  disabledSkills: string[];
  maxBudgetUsd: string;
  maxTurns: string;
  model: string;
}

interface SettingsSetters {
  readonly handleAuto: (autoApprove: boolean) => void;
  readonly handleBash: (allowBash: boolean) => void;
  readonly handleBudget: (maxBudgetUsd: string) => void;
  readonly handleInstall: (allowInstall: boolean) => void;
  readonly handleModel: (model: string) => void;
  readonly handleSkills: (disabledSkills: string[]) => void;
  readonly handleTurns: (maxTurns: string) => void;
}

const useSettingsDraft = <Draft extends DraftFields>(
  draft: Draft,
  onChange: (next: Draft) => void
): SettingsSetters => {
  const set = useCallback(
    (patch: Partial<DraftFields>): void => onChange({ ...draft, ...patch }),
    [draft, onChange]
  );

  const handleModel = useCallback((model: string) => set({ model }), [set]);

  const handleBudget = useCallback(
    (maxBudgetUsd: string) => set({ maxBudgetUsd }),
    [set]
  );

  const handleTurns = useCallback(
    (maxTurns: string) => set({ maxTurns }),
    [set]
  );

  const handleBash = useCallback(
    (allowBash: boolean) =>
      set({ allowBash, allowInstall: allowBash && draft.allowInstall }),
    [draft.allowInstall, set]
  );

  const handleInstall = useCallback(
    (allowInstall: boolean) => set({ allowInstall }),
    [set]
  );

  const handleAuto = useCallback(
    (autoApprove: boolean) => set({ autoApprove }),
    [set]
  );

  const handleSkills = useCallback(
    (disabledSkills: string[]) => set({ disabledSkills }),
    [set]
  );

  return {
    handleAuto,
    handleBash,
    handleBudget,
    handleInstall,
    handleModel,
    handleSkills,
    handleTurns,
  };
};

export { useSettingsDraft };
