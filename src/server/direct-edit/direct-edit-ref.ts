interface DirectionInput {
  readonly directionId: string;
  readonly projectId: string;
}

const REF_KEYS = new Set(["directionId", "projectId"]);

const toRef = (input: DirectionInput): DirectionInput => ({
  directionId: input.directionId,
  projectId: input.projectId,
});

const toBody = (input: DirectionInput): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    Object.entries(input).filter(([key]) => !REF_KEYS.has(key))
  );

export { toBody, toRef };
