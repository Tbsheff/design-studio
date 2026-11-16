const pick = <Test, WhenTrue, WhenFalse>(
  test: Test,
  whenTrue: WhenTrue,
  whenFalse: WhenFalse
): WhenFalse | WhenTrue => {
  if (test) {
    return whenTrue;
  }

  return whenFalse;
};

export { pick };
