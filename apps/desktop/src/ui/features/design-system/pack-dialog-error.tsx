import type { ReactElement } from "react";

const PackDialogError = ({
  error,
}: {
  error: string | null;
}): ReactElement | null => {
  if (!error) {
    return null;
  }

  return (
    <div className="alert error small" role="alert">
      {error}
    </div>
  );
};

export { PackDialogError };
