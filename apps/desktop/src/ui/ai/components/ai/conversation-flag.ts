const toBottomFlag = (isAtBottom: boolean): "false" | "true" => {
  if (isAtBottom) {
    return "true";
  }

  return "false";
};

export { toBottomFlag };
