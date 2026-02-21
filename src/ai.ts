import { generateText } from 'ai';
import { config, defaultConfig } from './config.js';
import {
  isProviderName,
  providerNames,
  providers,
  type ApiKeyConfigKey,
  type ProviderName,
} from './providers.js';

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
    const resolved = resolveModelSelector(overrideModel);
    let provider = resolved.provider;
    let model = resolved.model;

    if (shouldFallbackToOpenRouter(provider)) {
      model = `${provider}/${model}`;
      provider = 'openrouter';
    }

    const modelFactory = resolveModelFactory(provider);
    const llm = modelFactory(model);
    const disableThinking = config.get(
      'disable_thinking',
      defaultConfig.disable_thinking,
    );
    const providerOptions = providers[provider].getProviderOptions({
      disableThinking,
    });

    const result = await generateText({
      model: llm,
      prompt,
      maxOutputTokens: maxTokens,
      temperature,
      ...(providerOptions ? { providerOptions } : {}),
    });

    const answer = result.text.trim();
    if (!answer) {
      return {
        error: `Error: The AI returned an empty answer. Finish reason: ${result.finishReason}`,
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
  const defaultProvider = config.get(
    'default_provider',
    defaultConfig.default_provider,
  );

  if (slashIndex === -1) {
    return { provider: defaultProvider, model: selector };
  }

  const providerPrefix = selector.slice(0, slashIndex);
  const model = selector.slice(slashIndex + 1);

  if (!isProviderName(providerPrefix)) {
    if (defaultProvider === 'openrouter') {
      return { provider: defaultProvider, model: selector };
    }

    throw new Error(
      `Unknown provider "${providerPrefix}". Use one of: ${providerNames.join(', ')}.`,
    );
  }

  if (!model) {
    throw new Error(`Missing model in selector "${selector}".`);
  }

  return { provider: providerPrefix, model };
}

function resolveModelFactory(provider: ProviderName) {
  const providerConfig = providers[provider];
  const apiKey = getApiKey(providerConfig.apiKeyConfigKey);
  const openrouterBaseUrl = config.get(
    'openrouter_base_url',
    defaultConfig.openrouter_base_url,
  );

  return providerConfig.createModelFactory({
    apiKey,
    openrouterBaseUrl,
  });
}

function shouldFallbackToOpenRouter(provider: ProviderName) {
  if (provider === 'openrouter') {
    return false;
  }

  const defaultProvider = config.get(
    'default_provider',
    defaultConfig.default_provider,
  );

  if (defaultProvider !== 'openrouter') {
    return false;
  }

  const providerConfig = providers[provider];

  if (hasApiKey(providerConfig.apiKeyConfigKey)) {
    return false;
  }

  return hasApiKey(providers.openrouter.apiKeyConfigKey);
}

function hasApiKey(configKey: ApiKeyConfigKey) {
  return Boolean(resolveKey(config.get(configKey)));
}

function getApiKey(configKey: ApiKeyConfigKey) {
  const configured = config.get(configKey);
  const key = resolveKey(configured);

  if (!key) {
    throw new Error(
      `Missing API key for ${configKey}. Set ${configKey} or use env:MY_API_KEY in config.`,
    );
  }

  return key;
}

function resolveKey(value?: string) {
  if (!value) return undefined;
  if (value.startsWith('env:')) {
    return process.env[value.replace('env:', '')];
  }
  return value;
}
