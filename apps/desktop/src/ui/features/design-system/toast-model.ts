interface ToastEntry {
  id: number;
  text: string;
}

const toRemainingToast = (
  current: ToastEntry | null,
  id: number
): ToastEntry | null => {
  if (current?.id === id) {
    return null;
  }

  return current;
};

export { toRemainingToast };

export type { ToastEntry };
