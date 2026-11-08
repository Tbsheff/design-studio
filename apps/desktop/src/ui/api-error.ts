const errorText = <Caught>(err: Caught): string => {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
};

export { errorText };
