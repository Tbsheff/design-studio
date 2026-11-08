import type { ReactElement, ReactNode } from "react";

interface SettingsModalBodyProps {
  readonly children: ReactNode;
  readonly error: string | null;
}

const SettingsModalBody = ({
  children,
  error,
}: SettingsModalBodyProps): ReactElement => (
  <div className="modal-body">
    {children}
    {error && (
      <div className="alert error" role="alert">
        {error}
      </div>
    )}
  </div>
);

export { SettingsModalBody };
