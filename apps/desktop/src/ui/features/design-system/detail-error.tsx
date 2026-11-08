import type { ReactElement } from "react";

const DetailError = ({
  message,
}: {
  message: string | null;
}): ReactElement | null => {
  if (!message) {
    return null;
  }

  return (
    <div className="alert error small" role="alert">
      {message}
    </div>
  );
};

export { DetailError };
