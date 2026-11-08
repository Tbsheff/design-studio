import type { ReactElement } from "react";

import { cn } from "../../lib/utils";

interface AttachmentProgressProps {
  readonly className?: string;
}

const PROGRESS_RADIUS = 10;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;
const INDETERMINATE_SHARE = 0.75;

const AttachmentProgress = ({
  className,
}: AttachmentProgressProps): ReactElement => (
  <svg
    aria-hidden
    className={cn("size-6 text-current animate-spin", className)}
    data-slot="attachment-progress"
    viewBox="0 0 24 24"
  >
    <circle
      className="stroke-current opacity-25"
      cx="12"
      cy="12"
      fill="none"
      r={PROGRESS_RADIUS}
      strokeWidth="2"
    />
    <circle
      className="stroke-current transition-[stroke-dashoffset] duration-300"
      cx="12"
      cy="12"
      fill="none"
      r={PROGRESS_RADIUS}
      strokeDasharray={PROGRESS_CIRCUMFERENCE}
      strokeDashoffset={PROGRESS_CIRCUMFERENCE * INDETERMINATE_SHARE}
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
);

export { AttachmentProgress };
