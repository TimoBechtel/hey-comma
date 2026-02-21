import enquirer from 'enquirer';
import { config, type ProviderName } from './config.js';

const { prompt } = enquirer;
const providerChoices = [
  'openai',
  'anthropic',
  'google',
  'openrouter',
] as const;

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
    choices: [...providerChoices],
    required: true,
    stdin: process.stdin,
  });

  const modelAnswer = await prompt<{ model: string }>({
    type: 'input',
    message: 'Default model name',
    initial: getInitialModel(providerAnswer.provider),
    name: 'model',
    required: true,
    stdin: process.stdin,
  });

  const apiKeyField = getApiKeyField(providerAnswer.provider);
  const keyAnswer = await prompt<{ token: string }>({
    type: 'password',
    message: `API key for ${providerAnswer.provider} (or env:YOUR_ENV_VAR)`,
    name: 'token',
    required: true,
    stdin: process.stdin,
  });

  config.set('default_provider', providerAnswer.provider);
  config.set('default_model', modelAnswer.model);
  config.set(apiKeyField, keyAnswer.token);

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

  const keyField = getApiKeyField(defaultProvider);
  return !!config.get(keyField);
}

function getApiKeyField(provider: ProviderName) {
  if (provider === 'openai') return 'openai_api_key';
  if (provider === 'anthropic') return 'anthropic_api_key';
  if (provider === 'google') return 'google_api_key';
  return 'openrouter_api_key';
}

function getInitialModel(provider: ProviderName) {
  if (provider === 'openai') return 'gpt-4o-mini';
  if (provider === 'anthropic') return 'claude-sonnet-4-5';
  if (provider === 'google') return 'gemini-2.5-flash';
  return 'openai/gpt-4o-mini';
}
