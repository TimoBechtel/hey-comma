import Conf from 'conf';
import { config, configPath } from './config.js';

type CacheStore = Record<string, string>;

const cacheStore = new Conf<CacheStore>({
	configName: 'cache',
	projectSuffix: '',
	cwd: configPath,
});

// wrapper around cacheStore
export const cache = {
	get(key: string) {
		return cacheStore.get(compress(key));
	},
	set(key: string, value: string) {
		const maxEntries: number | undefined = config.get('cache.max_entries');

		cleanup({ maxEntries: maxEntries ?? 0 });
		cacheStore.set(compress(key), value);
	},
	delete(key: string) {
		cacheStore.delete(compress(key));
	},
	clear() {
		cacheStore.clear();
	},
};

function compress(input: string) {
	input = input.replaceAll(/[^\w]+/g, '');
	input = input.toLowerCase();
	return input;
}

/**
 * cleanup old cache entries to prevent the cache from growing too large
 */
function cleanup({ maxEntries }: { maxEntries: number }) {
	const keys = Object.keys(cacheStore.store);
	if (keys.length > maxEntries) {
		// we assume that the keys are sorted by date
		const keysToDelete = keys.slice(0, keys.length - maxEntries);
		keysToDelete.forEach((key) => {
			cacheStore.delete(key);
		});
	}
}
