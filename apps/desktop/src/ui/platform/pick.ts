const pick = <WhenTrue, WhenFalse>(
  test: boolean,
  whenTrue: WhenTrue,
  whenFalse: WhenFalse
): WhenFalse | WhenTrue => {
  if (test) {
    return whenTrue;
  }

  return whenFalse;
};

export { pick };
