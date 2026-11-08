import { useCallback } from "react";
import type { ReactElement, ReactNode } from "react";

import type { PendingAttachment } from "../../domain/pending-attachment.js";
import { copy } from "./copy.js";

type AlertComponent = (props: {
  readonly children: ReactNode;
  readonly onClose: () => void;
}) => ReactElement;

const FileAlert = ({
  file,
  Alert,
  onRemove,
}: {
  file: PendingAttachment;
  Alert: AlertComponent;
  onRemove: (localId: string) => void;
}): ReactElement | null => {
  const { localId } = file;
  const onClose = useCallback(() => onRemove(localId), [onRemove, localId]);

  if (!file.error) {
    return null;
  }

  return (
    <Alert onClose={onClose}>
      {file.name}
      {copy.text6}
      {file.error}
    </Alert>
  );
};

export { FileAlert };

export type { AlertComponent };
