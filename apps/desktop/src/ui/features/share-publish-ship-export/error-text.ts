const toErrorText = (failure: Error | string): string => {
  if (failure instanceof Error) {
    return failure.message;
  }

  return String(failure);
};

export { toErrorText };
