import { userInfo } from 'node:os';
import path from 'node:path';
import { parse, stringify } from '@iarna/toml';
import Conf from 'conf';
import {
  providerNames,
  providers,
  type ApiKeyConfigKey,
  type ProviderName,
} from './providers.js';

const { homedir } = userInfo();

export const configPath = path.join(homedir, '.hey-comma');

type ProviderApiKeyConfig = Partial<
  Record<Extract<ApiKeyConfigKey, string>, string>
>;

export type CodexConfigValue =
  | boolean
  | number
  | string
  | { [key: string]: CodexConfigValue };

type Config = ProviderApiKeyConfig & {
  default_provider?: ProviderName;
  default_model?: string;
  model_aliases?: Record<string, string>;
  spawn_agent?: {
    codex?: {
      config?: Record<string, CodexConfigValue>;
    };
  };
  openrouter_base_url?: string;
  disable_thinking?: boolean;
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
  default_model: providers.openai.defaultModel,
  model_aliases: {},
  spawn_agent: {
    codex: {
      config: {
        approval_policy: 'untrusted',
        sandbox_mode: 'read-only',
      },
    },
  },
  openrouter_base_url: 'https://openrouter.ai/api/v1',
  disable_thinking: false,
  temperature: 0.2,
  max_tokens: 1200,
  cache: {
    max_entries: 50,
  },
} satisfies Config;

const providerApiKeySchema = Object.fromEntries(
  providerNames.flatMap((providerName) => {
    const apiKeyConfigKey = providers[providerName].apiKeyConfigKey;

    if (!apiKeyConfigKey) {
      return [];
    }

    return [
      [
        apiKeyConfigKey,
        {
          type: 'string',
          format: 'password',
        },
      ],
    ];
  }),
);

const codexConfigValueSchema = {
  anyOf: [
    { type: 'boolean' },
    { type: 'number' },
    { type: 'string' },
    {
      type: 'object',
      additionalProperties: true,
    },
  ],
};

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
      enum: providerNames,
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
    spawn_agent: {
      type: 'object',
      properties: {
        codex: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              additionalProperties: codexConfigValueSchema,
            },
          },
        },
      },
    },
    ...providerApiKeySchema,
    openrouter_base_url: {
      type: 'string',
    },
    disable_thinking: {
      type: 'boolean',
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
