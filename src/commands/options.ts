import { InvalidArgumentError } from 'commander';

export type AiCommandOptions = {
  codexConfig?: string[];
  model?: string;
};

export function collectCodexConfig(value: string, previous: string[] = []) {
  const equalsIndex = value.indexOf('=');
  const key = value.slice(0, equalsIndex).trim();

  if (equalsIndex === -1 || !key) {
    throw new InvalidArgumentError('Codex config must use key=value.');
  }

  return [...previous, `${key}=${value.slice(equalsIndex + 1)}`];
}
