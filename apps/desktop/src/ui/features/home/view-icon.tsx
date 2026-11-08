import type { ReactElement } from "react";

const ICON_SIZE = 14;

const ICON_STROKE = 1.5;

const ViewIcon = ({
  view,
}: {
  readonly view: "list" | "grid";
}): ReactElement => {
  if (view === "list") {
    return (
      <svg
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={ICON_STROKE}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />
      </svg>
    );
  }

  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      aria-hidden="true"
    >
      <path d="M2.75 2.75h4v4h-4zM9.25 2.75h4v4h-4zM2.75 9.25h4v4h-4zM9.25 9.25h4v4h-4z" />
    </svg>
  );
};

export { ViewIcon };
