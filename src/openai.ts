import { OpenAI } from 'openai';
import { config, defaultConfig } from './config.js';

export async function askAi(
	prompt: string,
	{
		maxTokens = defaultConfig.max_tokens,
		overrideModel,
		temperature = defaultConfig.temperature,
	}: { maxTokens?: number; overrideModel?: string; temperature?: number } = {}
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
	const apiKey = getAPIKey();
	if (!apiKey) {
		return {
			error: 'Error: No OpenAI API key found. Did you run `hey, setup`?.',
			success: false,
			answer: null,
		};
	}

	const model =
		overrideModel ?? config.get('openai_model', defaultConfig.openai_model);
	const shouldUseLegacyAPI = useLegacyAPI(model);

	const client = createOpenAIClient({ apiKey });
	try {
		let answer: string | null = null;

		if (shouldUseLegacyAPI) {
			const result = await client.completions.create({
				model,
				prompt: JSON.stringify(prompt),
				temperature,
				max_tokens: maxTokens,
			});
			answer = result.choices[0]?.text;
		} else {
			const result = await client.chat.completions.create({
				model,
				messages: [
					{
						role: 'user',
						content: JSON.stringify(prompt),
					},
				],
				temperature,
				max_tokens: maxTokens,
			});
			answer = result.choices[0]?.message.content;
		}

		if (!answer) {
			return {
				error: 'Error: The ai returned an empty answer.',
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
		if (error instanceof OpenAI.APIError) {
			return {
				error: `OpenAI API error: ${error.message}`,
				success: false,
				answer: null,
			};
		}
		return {
			error: 'An unknown error occurred.',
			success: false,
			answer: null,
		};
	}
}

function createOpenAIClient({ apiKey }: { apiKey: string }) {
	return new OpenAI({
		apiKey,
	});
}

function getAPIKey() {
	const key = config.get('openai_api_key');
	if (key?.startsWith('env:')) {
		const envKey = key.replace('env:', '');
		return process.env[envKey];
	}
	return key;
}

function useLegacyAPI(model: string) {
	return !model.startsWith('gpt');
}
