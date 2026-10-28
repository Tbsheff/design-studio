const EDIT_CODE = 'read_file, then write_file';

const RULES: [RegExp, string][] = [
  [/is self-closing, so it has no text to edit here\.$/, `is self-closing, so it has no text to edit here. Change the JSX with ${EDIT_CODE}, or pass target "component" when the component sets the text.`],
  [/This element has no children to edit; ask the agent$/, `This element is self-closing in its source file, so it has no text to edit. When it is a shared component use, leave out target or pass target "use"; else change the JSX with ${EDIT_CODE}.`],
  [/; edit a leaf element or ask the agent$/, `, so its text cannot be set as one string. Pass the selector of a child element that holds only text, or change the JSX with ${EDIT_CODE}.`],
  [/ Edit the place where the component is used, or ask the agent\.$/, ` Leave out target (or pass target "use") to edit the place where the component is used, or change the JSX with ${EDIT_CODE}.`],
  [/ Change the data there, or ask the agent\.$/, ` Change the data there with ${EDIT_CODE}.`],
  [/ Ask the agent to change it\.$/, ` Change it with ${EDIT_CODE}.`],
  [/ Ask the agent to add a media query or :hover rule\.$/, ` Add a media query or :hover rule to the stylesheet with ${EDIT_CODE}.`],
  [/ Edit the stylesheet or ask the agent$/, ` Add the rule to the stylesheet with ${EDIT_CODE}.`],
  [/; ask the agent to add the markup$/, `; add the markup with ${EDIT_CODE}.`],
  [/; ask the agent to reorder the data$/, `; reorder the data with ${EDIT_CODE}.`],
  [/; ask the agent to ([^.;]+)\.?$/, `; $1 with ${EDIT_CODE}.`],
  [/;? ?(?:or )?ask the agent\.?$/i, `. Change the code with ${EDIT_CODE}.`],
];

export function mcpErrorText(message: string): string {
  for (const [pattern, replacement] of RULES) if (pattern.test(message)) return message.replace(pattern, replacement);
  return message.replace(/,? ?or ask the agent/gi, '').replace(/ask the agent to /gi, 'use write_file to ');
}
