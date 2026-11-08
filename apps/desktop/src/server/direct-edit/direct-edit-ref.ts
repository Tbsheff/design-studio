interface DirectionInput {
  readonly directionId: string;
  readonly projectId: string;
}

type RefKey = keyof DirectionInput;

const REF_KEYS = new Set(["directionId", "projectId"]);

const toRef = (input: DirectionInput): DirectionInput => ({
  directionId: input.directionId,
  projectId: input.projectId,
});

const toBody = (input: DirectionInput): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    Object.entries(input).filter(([key]) => !REF_KEYS.has(key))
  );

type EditBody = ReturnType<typeof toBody>;

const toFields = <Fields extends DirectionInput>(
  input: Fields
): Omit<Fields, RefKey> => {
  const fields = toBody(input);

  return fields as Omit<Fields, RefKey>;
};

export { toBody, toFields, toRef };

export type { EditBody };
