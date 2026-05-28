import enquirer from 'enquirer';
import { config } from './config.js';
import {
  getApiKeyConfigKey,
  providerNames,
  providers,
  type ProviderName,
} from './providers.js';

const { prompt } = enquirer;

export async function setup() {
  if (isConfigured()) {
    console.info('hey, is already configured.');
    console.info(`Delete ${config.path} to reset.`);
    return;
  }

  console.info("Looks like you haven't configured hey, yet.");

  const providerAnswer = await prompt<{ provider: ProviderName }>({
    type: 'select',
    message: 'Select your default provider',
    name: 'provider',
    choices: [...providerNames],
    required: true,
    stdin: process.stdin,
  });

  const modelAnswer = await prompt<{ model: string }>({
    type: 'input',
    message: 'Default model name',
    initial: providers[providerAnswer.provider].defaultModel,
    name: 'model',
    required: true,
    stdin: process.stdin,
  });

  config.set('default_provider', providerAnswer.provider);
  config.set('default_model', modelAnswer.model);

  const apiKeyField = getApiKeyConfigKey(providerAnswer.provider);

  if (apiKeyField) {
    const keyAnswer = await prompt<{ token: string }>({
      type: 'password',
      message: `API key for ${providerAnswer.provider} (or env:YOUR_ENV_VAR)`,
      name: 'token',
      required: true,
      stdin: process.stdin,
    });

    config.set(apiKeyField, keyAnswer.token);
  }

  if (providerAnswer.provider === 'openrouter') {
    const baseUrl = await prompt<{ baseUrl: string }>({
      type: 'input',
      message: 'OpenRouter base URL',
      initial: 'https://openrouter.ai/api/v1',
      name: 'baseUrl',
      required: true,
      stdin: process.stdin,
    });
    config.set('openrouter_base_url', baseUrl.baseUrl);
  }
}

export function isConfigured() {
  const defaultProvider = config.get('default_provider');
  const defaultModel = config.get('default_model');

  if (!defaultProvider || !defaultModel) {
    return false;
  }

  const keyField = getApiKeyConfigKey(defaultProvider);

  if (!keyField) {
    return true;
  }

  return !!config.get(keyField);
}
