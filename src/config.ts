import { parse, stringify } from '@iarna/toml';
import Conf from 'conf';
import { userInfo } from 'node:os';
import path from 'node:path';

const { homedir } = userInfo();

export const configPath = path.join(homedir, '.hey-comma');

type Config = {
	openai_api_key?: string;
	openai_model?: string;
	temperature?: number;
	max_tokens?: number;
	run_prompt?: string;
	explain_prompt?: string;
	cache?: {
		max_entries?: number;
	};
};

export const defaultConfig = {
	openai_model: 'gpt-3.5-turbo',
	temperature: 0.2,
	max_tokens: 256,
	cache: {
		max_entries: 50,
	},
} satisfies Config;

export const config = new Conf<Config>({
	configName: 'config',
	cwd: configPath,
	configFileMode: 0o600,
	fileExtension: 'toml',
	deserialize: parse,
	serialize: stringify,
	projectSuffix: '',
	schema: {
		openai_api_key: {
			type: 'string',
			format: 'password',
		},
		openai_model: {
			type: 'string',
		},
		temperature: {
			type: 'number',
			minimum: 0,
			maximum: 1,
		},
		max_tokens: {
			type: 'number',
		},
		run_prompt: {
			type: 'string',
		},
		explain_prompt: {
			type: 'string',
		},
		cache: {
			type: 'object',
			properties: {
				max_entries: {
					type: 'number',
				},
			},
		},
	},
	defaults: defaultConfig,
});
