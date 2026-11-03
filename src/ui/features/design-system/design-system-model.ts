export interface DesignSystemActions {
  onApply: (packId: string) => Promise<void>;
  onSave: (
    name: string,
    packId?: string,
    asNew?: boolean,
    force?: boolean
  ) => Promise<void>;
}
