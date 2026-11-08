import type { ReactElement, ReactNode } from "react";

const SLOT_CLASS = ["proto-slot", "proto-slot narrow"];

interface ProtoSlotProps {
  readonly isNarrow: boolean;
  readonly children: ReactNode;
}

const ProtoSlot = ({ isNarrow, children }: ProtoSlotProps): ReactElement => (
  <span className={SLOT_CLASS[Number(isNarrow)]}>{children}</span>
);

export { ProtoSlot };
