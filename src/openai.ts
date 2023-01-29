import { Configuration, OpenAIApi } from 'openai';
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
	const { status, data } = await client.createCompletion({
		model,
		prompt: JSON.stringify(prompt),
		temperature: 0.7,
		max_tokens: maxTokens,
	});

	if (status !== 200) {
		return {
			error: 'OpenAI API error: ' + data,
			success: false,
			answer: null,
		};
	}

	// trim leading and trailing whitespace or newlines
	const answer = data.choices[0]?.text;

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
}

function createOpenAIClient({ apiKey }: { apiKey: string }) {
	const configuration = new Configuration({
		apiKey,
	});
	return new OpenAIApi(configuration);
}

function getAPIKey() {
	const key = config.get('openai_api_key');
	if (key?.startsWith('env:')) {
		const envKey = key.replace('env:', '');
		return process.env[envKey];
	}
	return key;
}
