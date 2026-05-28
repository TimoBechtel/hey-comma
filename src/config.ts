import { userInfo } from 'node:os';
import path from 'node:path';
import { parse, stringify } from '@iarna/toml';
import Conf from 'conf';
import {
  getApiKeyConfigKey,
  providerNames,
  providers,
  type ApiKeyConfigKey,
  type ProviderName,
} from './providers.js';

const { homedir } = userInfo();

export const configPath = path.join(homedir, '.hey-comma');

type ProviderApiKeyConfig = Partial<Record<ApiKeyConfigKey, string>>;

export type AcpClientConfig = {
  args?: string[];
  command?: string;
  env?: Record<string, string>;
};

type Config = ProviderApiKeyConfig & {
  default_provider?: ProviderName;
  default_model?: string;
  model_aliases?: Record<string, string>;
  acp?: {
    clients?: Record<string, AcpClientConfig>;
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
  acp: {
    clients: {
      codex: {
        command: 'codex-acp',
        args: ['-c approval_policy="untrusted"', '-c sandbox_mode="read-only"'],
      },
      claude: {
        command: 'claude-agent-acp',
      },
      copilot: {
        command: 'copilot',
        args: ['--acp'],
      },
      cursor: {
        command: 'agent',
        args: ['acp'],
      },
      gemini: {
        command: 'gemini',
        args: ['--acp'],
      },
      opencode: {
        command: 'opencode',
        args: ['acp'],
      },
      pi: {
        command: 'pi',
        args: ['acp'],
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
    const apiKeyConfigKey = getApiKeyConfigKey(providerName);

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
    acp: {
      type: 'object',
      properties: {
        clients: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              args: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              command: {
                type: 'string',
              },
              env: {
                type: 'object',
                additionalProperties: {
                  type: 'string',
                },
              },
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
});
