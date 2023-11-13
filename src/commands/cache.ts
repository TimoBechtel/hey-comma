import { Command } from 'commander';
import { cache } from '../cache.js';

const program = new Command();

const cacheCmd = program.command('cache').description('manage the cache');

cacheCmd
	.command('clear')
	.description('clear the cache')
	.action(() => {
		cache.clear();
	});

export default cacheCmd;
