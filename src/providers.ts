import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// disable warnings, like temperature not supported by some models
(globalThis as { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

type ProviderFactoryOptions = {
  apiKey?: string;
  openrouterBaseUrl?: string;
};

type ProviderOptionsInput = {
  disableThinking: boolean;
};

type LlmProviderDefinition = {
  type: 'llm';
  apiKeyConfigKey: `${string}_api_key`;
  defaultModel: string;
  createModelFactory: (
    options: ProviderFactoryOptions,
  ) => (model: string) => unknown;
  getProviderOptions: (
    options: ProviderOptionsInput,
  ) => Record<string, unknown> | undefined;
};

type AcpProviderDefinition = {
  type: 'acp';
  defaultModel: string;
};

type ProviderDefinition = AcpProviderDefinition | LlmProviderDefinition;

export const providers = {
  openai: {
    type: 'llm',
    apiKeyConfigKey: 'openai_api_key',
    defaultModel: 'gpt-5.1-codex-mini',
    createModelFactory: ({ apiKey }) => createOpenAI({ apiKey }),
    getProviderOptions: ({ disableThinking }) =>
      disableThinking ? { openai: { reasoningEffort: 'minimal' } } : undefined,
  },
  anthropic: {
    type: 'llm',
    apiKeyConfigKey: 'anthropic_api_key',
    defaultModel: 'claude-haiku-4-5',
    createModelFactory: ({ apiKey }) => createAnthropic({ apiKey }),
    getProviderOptions: ({ disableThinking }) =>
      disableThinking
        ? { anthropic: { thinking: { type: 'disabled' } } }
        : undefined,
  },
  google: {
    type: 'llm',
    apiKeyConfigKey: 'google_api_key',
    defaultModel: 'gemini-2.5-flash',
    createModelFactory: ({ apiKey }) => createGoogleGenerativeAI({ apiKey }),
    getProviderOptions: () => undefined,
  },
  openrouter: {
    type: 'llm',
    apiKeyConfigKey: 'openrouter_api_key',
    defaultModel: 'openai/gpt-5.1-codex-mini',
    createModelFactory: ({ apiKey, openrouterBaseUrl }) =>
      createOpenRouter({
        apiKey,
        baseURL: openrouterBaseUrl,
      }),
    getProviderOptions: ({ disableThinking }) =>
      disableThinking
        ? { openrouter: { reasoning: { max_tokens: 0 } } }
        : undefined,
  },
  acp: {
    type: 'acp',
    defaultModel: 'codex',
  },
} as const satisfies Record<string, ProviderDefinition>;

export type ProviderName = keyof typeof providers;
export type LlmProviderName = {
  [Name in ProviderName]: (typeof providers)[Name]['type'] extends 'llm'
    ? Name
    : never;
}[ProviderName];
export type ApiKeyConfigKey =
  (typeof providers)[LlmProviderName]['apiKeyConfigKey'];

export const providerNames = Object.keys(providers) as ProviderName[];

export function isProviderName(value: string): value is ProviderName {
  return providerNames.includes(value as ProviderName);
}

export function getApiKeyConfigKey(providerName: ProviderName) {
  const provider = providers[providerName];
  return provider.type === 'llm' ? provider.apiKeyConfigKey : undefined;
}
