import type { ReactElement } from "react";

const ReasonText = ({
  id,
  text,
}: {
  id: string;
  text: string | null;
}): ReactElement | null => {
  if (!text) {
    return null;
  }

  return (
    <span id={id} className="sr-only">
      {text}
    </span>
  );
};

export { ReasonText };
