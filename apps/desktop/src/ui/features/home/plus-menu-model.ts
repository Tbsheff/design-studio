interface PlusMenuActions {
  readonly onAttachFile: () => void;
  readonly onLinkCode: () => void;
  readonly onTemplates: () => void;
  readonly hasTemplatesShown: boolean;
  readonly onImportSystem: () => void;
  readonly onDesignSystem: () => void;
  readonly onSkills: () => void;
  readonly onLocation: () => void;
}

export type { PlusMenuActions };
