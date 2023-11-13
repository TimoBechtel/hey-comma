#!/usr/bin/env node
import { program } from 'commander';
import cacheCmd from './commands/cache.js';
import configCmd from './commands/config.js';
import explainCmd from './commands/explain.js';
import runCmd from './commands/run.js';
import setupCmd from './commands/setup.js';
import { context } from './context.js';

const VERSION = process.env.VERSION ?? '0.0.0';
const DESCRIPTION = process.env.DESCRIPTION ?? 'No description';

function initProgram({
	defaultCommand,
}: {
	defaultCommand?: 'run' | 'explain';
}) {
	return program
		.name('hey,')
		.version(VERSION)
		.description(DESCRIPTION)
		.addCommand(runCmd, { isDefault: defaultCommand === 'run' })
		.addCommand(explainCmd, { isDefault: defaultCommand === 'explain' })
		.addCommand(setupCmd)
		.addCommand(configCmd)
		.addCommand(cacheCmd)
		.addHelpText(
			'after',
			`
Examples:
	$ hey, what are the largest files in my download directory
	$ hey, create a tarball with all files in the current directory, except javascript files
	$ cat script.sh | hey, is this safe to run
	$ cat salaries.csv | hey, what is the average salary for a software engineer in the US
		`
		);
}

async function run() {
	if (process.stdin.isTTY) {
		await initProgram({ defaultCommand: 'run' }).parseAsync(process.argv);
	} else {
		await new Promise<void>((resolve) => {
			// Read from stdin (e.g. `echo "hello" | hey, <instruction>`)
			process.stdin.on('readable', () => {
				const chunk = process.stdin.read() as string | null;
				if (chunk !== null) {
					context.stdin += chunk;
				}
			});
			process.stdin.on('end', async () => {
				process.stdin.removeAllListeners();
				process.stdin.pause();
				await initProgram({ defaultCommand: 'explain' }).parseAsync(
					process.argv
				);
				resolve();
			});
		});
	}
}

await run();
