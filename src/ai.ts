import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { createOpenRouter, openrouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { config, defaultConfig, type ProviderName } from './config.js';

type AskAiOptions = {
  maxTokens?: number;
  overrideModel?: string;
  temperature?: number;
};

export async function askAi(
  prompt: string,
  {
    maxTokens = defaultConfig.max_tokens,
    overrideModel,
    temperature = defaultConfig.temperature,
  }: AskAiOptions = {},
): Promise<
  | {
      answer: string;
      success: true;
      error: null;
    }
  | {
      answer: null;
      success: false;
      error: string;
    }
> {
  try {
    const { provider, model } = resolveModelSelector(overrideModel);
    const modelFactory = resolveModelFactory(provider);
    const llm = modelFactory(model);

    const result = await generateText({
      model: llm,
      prompt: JSON.stringify(prompt),
      maxOutputTokens: maxTokens,
      temperature,
    });

    const answer = result.text.trim();
    if (!answer) {
      return {
        error: 'Error: The AI returned an empty answer.',
        success: false,
        answer: null,
      };
    }

    return {
      answer,
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'An unknown error occurred.',
      success: false,
      answer: null,
    };
  }
}

function resolveModelSelector(rawModel?: string): {
  provider: ProviderName;
  model: string;
} {
  const aliases = config.get('model_aliases', defaultConfig.model_aliases);
  const aliasedModel =
    rawModel && aliases[rawModel] ? aliases[rawModel] : rawModel;
  const selector =
    aliasedModel ?? config.get('default_model', defaultConfig.default_model);

  if (!selector) {
    throw new Error('No model selector configured. Run `hey, setup`.');
  }

  const slashIndex = selector.indexOf('/');
  if (slashIndex === -1) {
    const provider = config.get(
      'default_provider',
      defaultConfig.default_provider,
    );
    return { provider, model: selector };
  }

  const providerPrefix = selector.slice(0, slashIndex);
  const model = selector.slice(slashIndex + 1);

  if (!isProviderName(providerPrefix)) {
    throw new Error(
      `Unknown provider "${providerPrefix}". Use one of: openai, anthropic, google, openrouter.`,
    );
  }

  if (!model) {
    throw new Error(`Missing model in selector "${selector}".`);
  }

  return { provider: providerPrefix, model };
}

function isProviderName(provider: string): provider is ProviderName {
  return (
    provider === 'openai' ||
    provider === 'anthropic' ||
    provider === 'google' ||
    provider === 'openrouter'
  );
}

function resolveModelFactory(provider: ProviderName) {
  switch (provider) {
    case 'openai': {
      const apiKey = getApiKey('openai_api_key', 'OPENAI_API_KEY');
      return createOpenAI({ apiKey });
    }
    case 'anthropic': {
      const apiKey = getApiKey('anthropic_api_key', 'ANTHROPIC_API_KEY');
      return createAnthropic({ apiKey });
    }
    case 'google': {
      const apiKey = getApiKey('google_api_key', 'GOOGLE_API_KEY');
      return createGoogleGenerativeAI({ apiKey });
    }
    case 'openrouter': {
      const apiKey = getApiKey('openrouter_api_key', 'OPENROUTER_API_KEY');
      const baseURL = config.get(
        'openrouter_base_url',
        defaultConfig.openrouter_base_url,
      );
      return createOpenRouter({ apiKey, baseURL });
    }
    default: {
      throw new Error('Unsupported provider.');
    }
  }
}

function getApiKey(configKey: KeyConfig, envName: string) {
  const configured = config.get(configKey);
  const key = resolveKey(configured);

  if (!key) {
    throw new Error(
      `Missing API key for ${configKey}. Set ${configKey} or use env:${envName} in config.`,
    );
  }

  return key;
}

type KeyConfig =
  | 'openai_api_key'
  | 'anthropic_api_key'
  | 'google_api_key'
  | 'openrouter_api_key';

function resolveKey(value?: string) {
  if (!value) return undefined;
  if (value.startsWith('env:')) {
    return process.env[value.replace('env:', '')];
  }
  return value;
}

// Keep these imports referenced so tree-shaking does not prune provider symbols.
void openai;
void anthropic;
void google;
void openrouter;
