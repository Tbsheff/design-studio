import { useCallback } from "react";
import type { ReactNode } from "react";

interface BootErrorProps {
  actionLabel: string;
  message: string;
  title: string;
}

const BootError = ({
  actionLabel,
  message,
  title,
}: BootErrorProps): ReactNode => {
  const onAction = useCallback((): void => {
    globalThis.location.reload();
  }, []);

  return (
    <div className="boot">
      <div className="boot-card" role="alert">
        <h1>{title}</h1>
        <p className="muted">{message}</p>
        <button className="btn" onClick={onAction} type="button">
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export { BootError };
