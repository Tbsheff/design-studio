interface DesignSystemActions {
  onApply: (packId: string) => Promise<void>;
  onSaveNamed: (name: string, asNew: boolean) => Promise<void>;
  onSave: (
    name: string,
    packId?: string,
    asNew?: boolean,
    force?: boolean
  ) => Promise<void>;
}

export type { DesignSystemActions };
