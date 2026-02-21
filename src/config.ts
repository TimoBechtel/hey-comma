import { userInfo } from 'node:os';
import path from 'node:path';
import { parse, stringify } from '@iarna/toml';
import Conf from 'conf';

const { homedir } = userInfo();

export const configPath = path.join(homedir, '.hey-comma');

export type ProviderName = 'openai' | 'anthropic' | 'google' | 'openrouter';

type Config = {
  default_provider?: ProviderName;
  default_model?: string;
  model_aliases?: Record<string, string>;
  openai_api_key?: string;
  anthropic_api_key?: string;
  google_api_key?: string;
  openrouter_api_key?: string;
  openrouter_base_url?: string;
  temperature?: number;
  max_tokens?: number;
  run_prompt?: string;
  explain_prompt?: string;
  cache?: {
    max_entries?: number;
  };
};

export const defaultConfig = {
  default_provider: 'openai',
  default_model: 'gpt-4o-mini',
  model_aliases: {},
  openrouter_base_url: 'https://openrouter.ai/api/v1',
  temperature: 0.2,
  max_tokens: 256,
  cache: {
    max_entries: 50,
  },
} satisfies Config;

export const config = new Conf<Config>({
  configName: 'config',
  cwd: configPath,
  configFileMode: 0o600,
  fileExtension: 'toml',
  deserialize: parse,
  serialize: stringify,
  projectSuffix: '',
  schema: {
    default_provider: {
      type: 'string',
      enum: ['openai', 'anthropic', 'google', 'openrouter'],
    },
    default_model: {
      type: 'string',
    },
    model_aliases: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
    openai_api_key: {
      type: 'string',
      format: 'password',
    },
    anthropic_api_key: {
      type: 'string',
      format: 'password',
    },
    google_api_key: {
      type: 'string',
      format: 'password',
    },
    openrouter_api_key: {
      type: 'string',
      format: 'password',
    },
    openrouter_base_url: {
      type: 'string',
    },
    temperature: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    max_tokens: {
      type: 'number',
    },
    run_prompt: {
      type: 'string',
    },
    explain_prompt: {
      type: 'string',
    },
    cache: {
      type: 'object',
      properties: {
        max_entries: {
          type: 'number',
        },
      },
    },
  },
  defaults: defaultConfig,
});
