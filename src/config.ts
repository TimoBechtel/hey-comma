import { parse, stringify } from '@iarna/toml';
import Conf from 'conf';
import { userInfo } from 'node:os';
import path from 'node:path';

const { homedir } = userInfo();

export const configPath = path.join(homedir, '.hey-comma');

type Config = {
	openai_api_key?: string;
	openai_model?: string;
	cache?: {
		max_entries?: number;
	};
};

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
		cache: {
			type: 'object',
			properties: {
				max_entries: {
					type: 'number',
				},
			},
		},
	},
	defaults: {
		openai_model: 'text-davinci-003',
		cache: {
			max_entries: 50,
		},
	},
});
