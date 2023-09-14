import OpenAI from 'openai';
import { config } from './config.js';

export async function askAi(
	prompt: string,
	{ maxTokens = 256 }: { maxTokens?: number } = {}
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

	const model = config.get('openai_model', 'text-davinci-003');

	const client = createOpenAIClient({ apiKey });
	try {
		const { choices } = await client.completions.create({
			model,
			prompt: JSON.stringify(prompt),
			temperature: 0.7,
			max_tokens: maxTokens,
		});
		// trim leading and trailing whitespace or newlines
		const answer = choices[0]?.text;

		if (!answer) {
			return {
				error: 'Error: The ai returned an empty answer.',
				success: false,
				answer: null,
			};
		}

		return {
			answer: answer,
			success: true,
			error: null,
		};
	} catch (error) {
		if (error instanceof OpenAI.APIError) {
			return {
				error: 'OpenAI API error: ' + error.message,
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
