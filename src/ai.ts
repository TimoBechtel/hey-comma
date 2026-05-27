import { generateText } from 'ai';
import {
  SpawnAgent,
  type AgentEvent,
  type SupportedAgentId,
} from 'spawn-agent';
import { config, defaultConfig, type CodexConfigValue } from './config.js';
import {
  createCodexAdapter,
  isProviderName,
  providerNames,
  providers,
  type ApiKeyConfigKey,
  type ProviderName,
} from './providers.js';

type AskAiOptions = {
  codexConfig?: string[];
  maxTokens?: number;
  onProgress?: (message: string) => void;
  overrideModel?: string;
  temperature?: number;
};

export async function askAi(
  prompt: string,
  {
    codexConfig: codexConfigOverrides = [],
    maxTokens = defaultConfig.max_tokens,
    onProgress,
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
    const codexConfig = resolveCodexConfig({
      overrides: codexConfigOverrides,
      provider,
      model,
    });

    if (shouldFallbackToOpenRouter(provider)) {
      model = `${provider}/${model}`;
      provider = 'openrouter';
    }

    if (provider === 'spawn-agent') {
      return await askSpawnAgent(prompt, {
        codexConfig,
        model,
        onProgress,
      });
    }

    const modelFactory = resolveModelFactory(provider, { codexConfig });
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

async function askSpawnAgent(
  prompt: string,
  {
    codexConfig,
    model,
    onProgress,
  }: {
    codexConfig: string[];
    model: string;
    onProgress?: (message: string) => void;
  },
) {
  const agent = await SpawnAgent.connect(
    model === 'codex' && codexConfig.length
      ? createCodexAdapter(codexConfig)
      : (model as SupportedAgentId),
    {
      cwd: process.cwd(),
      permission: 'auto-allow-once',
    },
  );

  try {
    const sessionId = await agent.createSession({ cwd: process.cwd() });
    const turn = agent.prompt(sessionId, { prompt });
    let answer = '';

    for await (const event of turn) {
      if (event.type === 'text-delta') {
        answer += event.text;
      }

      const progress = getProgressMessage(event);
      if (progress) {
        onProgress?.(progress);
      }
    }

    const result = await turn.completion;
    const text = (result.text || answer).trim();

    if (!text) {
      return {
        error: `Error: The AI returned an empty answer. Finish reason: ${result.stopReason}`,
        success: false,
        answer: null,
      } as const;
    }

    return {
      answer: text,
      success: true,
      error: null,
    } as const;
  } finally {
    await agent.close();
  }
}

function getProgressMessage(event: AgentEvent) {
  if (event.type === 'thinking-delta') {
    return compactProgress(event.text);
  }

  if (event.type === 'tool-call') {
    return compactProgress(event.tool);
  }

  if (event.type === 'tool-call-update') {
    return event.title ? compactProgress(event.title) : null;
  }

  return null;
}

function compactProgress(text: string) {
  return text.trim().replaceAll(/\s+/g, ' ').slice(0, 120);
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

function resolveModelFactory(
  provider: ProviderName,
  { codexConfig }: { codexConfig: string[] },
) {
  const providerConfig = providers[provider];
  const apiKey = providerConfig.apiKeyConfigKey
    ? getApiKey(providerConfig.apiKeyConfigKey)
    : undefined;
  const openrouterBaseUrl = config.get(
    'openrouter_base_url',
    defaultConfig.openrouter_base_url,
  );

  return providerConfig.createModelFactory({
    apiKey,
    codexConfig,
    openrouterBaseUrl,
  });
}

function resolveCodexConfig({
  overrides,
  provider,
  model,
}: {
  overrides: string[];
  provider: ProviderName;
  model: string;
}) {
  const isCodex = provider === 'spawn-agent' && model === 'codex';

  if (!isCodex) {
    if (overrides.length) {
      throw new Error(
        '`--codex-config` can only be used with spawn-agent/codex.',
      );
    }

    return [];
  }

  const spawnAgentConfig = config.get('spawn_agent', defaultConfig.spawn_agent);
  const configured = spawnAgentConfig.codex?.config ?? {};

  return [
    ...Object.entries(configured).map(
      ([key, value]) => `${key}=${formatCodexConfigValue(value)}`,
    ),
    ...overrides,
  ];
}

function formatCodexConfigValue(value: CodexConfigValue): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  const entries = Object.entries(value)
    .map(([key, nestedValue]) => {
      return `${formatTomlKey(key)} = ${formatCodexConfigValue(nestedValue)}`;
    })
    .join(', ');

  return entries ? `{ ${entries} }` : '{}';
}

function formatTomlKey(key: string) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}

function shouldFallbackToOpenRouter(provider: ProviderName) {
  if (provider === 'openrouter' || provider === 'spawn-agent') {
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

function hasApiKey(configKey?: ApiKeyConfigKey) {
  if (!configKey) {
    return false;
  }

  return Boolean(resolveKey(config.get(configKey)));
}

function getApiKey(configKey?: ApiKeyConfigKey) {
  if (!configKey) {
    return undefined;
  }

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
