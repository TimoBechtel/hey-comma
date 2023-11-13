import enquirer from 'enquirer';
import { config } from './config.js';

const { prompt } = enquirer;

export async function setup() {
	if (isConfigured()) {
		console.info('hey, is already configured.');
		console.info(`Delete ${config.path} to reset.`);
		return;
	}

	console.info("Looks like you haven't configured the OpenAI API Token yet.");
	console.info(
		'You can get one from https://platform.openai.com/account/api-keys'
	);

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
