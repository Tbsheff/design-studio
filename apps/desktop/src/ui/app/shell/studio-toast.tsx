import type { ReactElement } from "react";

interface StudioToastProps {
  readonly text: string | null;
}

const StudioToast = ({ text }: StudioToastProps): ReactElement => (
  <output className="ds-toast-slot" aria-live="polite">
    {text && <div className="ds-toast">{text}</div>}
  </output>
);

export { StudioToast };
