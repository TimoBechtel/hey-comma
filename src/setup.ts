import enquirer from 'enquirer';
import { config } from './config.js';
const { prompt } = enquirer;

export async function setup() {
	config.clear();

	console.log("Looks like you haven't configured the OpenAI API Token yet.");
	console.log('You can get one from https://beta.openai.com/account/api-keys');

	const answer = await prompt<{ token: string }>({
		type: 'password',
		message: 'Enter your OpenAI token',
		name: 'token',
		required: true,
		stdin: process.stdin,
	});
	config.set('openai_api_key', answer.token);
}

export function isConfigured() {
	return !!config.get('openai_api_key');
}
