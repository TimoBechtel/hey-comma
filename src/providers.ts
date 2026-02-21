import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

type ProviderFactoryOptions = {
  apiKey: string;
  openrouterBaseUrl?: string;
};

type ProviderDefinition = {
  apiKeyConfigKey: `${string}_api_key`;
  envVar: string;
  defaultModel: string;
  createModelFactory: (
    options: ProviderFactoryOptions,
  ) => (model: string) => unknown;
};

export const providers = {
  openai: {
    apiKeyConfigKey: 'openai_api_key',
    envVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-5.1-codex-mini',
    createModelFactory: ({ apiKey }) => createOpenAI({ apiKey }),
  },
  anthropic: {
    apiKeyConfigKey: 'anthropic_api_key',
    envVar: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-haiku-4-5',
    createModelFactory: ({ apiKey }) => createAnthropic({ apiKey }),
  },
  google: {
    apiKeyConfigKey: 'google_api_key',
    envVar: 'GOOGLE_API_KEY',
    defaultModel: 'gemini-2.5-flash',
    createModelFactory: ({ apiKey }) => createGoogleGenerativeAI({ apiKey }),
  },
  openrouter: {
    apiKeyConfigKey: 'openrouter_api_key',
    envVar: 'OPENROUTER_API_KEY',
    defaultModel: 'openai/gpt-5.1-codex-mini',
    createModelFactory: ({ apiKey, openrouterBaseUrl }) =>
      createOpenRouter({
        apiKey,
        baseURL: openrouterBaseUrl,
      }),
  },
} as const satisfies Record<string, ProviderDefinition>;

export type ProviderName = keyof typeof providers;
export type ApiKeyConfigKey =
  (typeof providers)[ProviderName]['apiKeyConfigKey'];

export const providerNames = Object.keys(providers) as ProviderName[];

export function isProviderName(value: string): value is ProviderName {
  return providerNames.includes(value as ProviderName);
}
