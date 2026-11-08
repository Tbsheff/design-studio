interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

interface HomeToastState {
  readonly id: number;
  readonly text: string;
  readonly action?: ToastAction;
  readonly more?: ToastAction;
  readonly hasError: boolean;
}

const TOAST_MS = 8000;

const toToastClass = (hasError: boolean): string => {
  if (hasError) {
    return "ds-toast home-toast error";
  }

  return "ds-toast home-toast";
};

export { TOAST_MS, toToastClass };

export type { HomeToastState, ToastAction };
