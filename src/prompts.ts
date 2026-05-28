import { userInfo } from 'node:os';

const shell = userInfo().shell ?? 'sh';

export const prompts = {
  terminalCommand: ({
    instruction,
    customTemplate,
  }: {
    customTemplate?: string;
    instruction: string;
  }) =>
    (
      customTemplate ??
      'Please answer with exactly one single-line terminal command wrapped in <command> tags. Do not add quotation marks. The command has to be executed in a %SHELL% shell.\n%INSTRUCTION%'
    )
      .replace('%SHELL%', shell)
      .replace('%INSTRUCTION%', instruction),

  explanation: ({
    context,
    instruction,
    customTemplate,
  }: {
    customTemplate?: string;
    context: string;
    instruction: string;
  }) =>
    (customTemplate ?? '%INPUT%\n\n%INSTRUCTION%\nPlease give a short answer.')
      .replace('%INPUT%', context)
      .replace('%INSTRUCTION%', instruction),
};
