import { exec } from 'child_process';
import { Command } from 'commander';
import enquirer from 'enquirer';
import { createInterface } from 'node:readline/promises';
import ora from 'ora';
import { cache } from '../cache.js';
import { context } from '../context.js';
import { askAi } from '../openai.js';
import { prompts } from '../prompts.js';
import { isConfigured } from '../setup.js';

const program = new Command();
const runCmd = program
	.command('run')
	.alias('run:')
	.description('create a shell command from an instruction (default)')
	.argument('[instruction...]', 'instruction')
	.option('--gpt4', 'use the GPT-4 model')
	.hook('preAction', (command) => {
		if (!isConfigured()) {
			command.error(
				'hey, is not configured yet. Run `hey, setup` to get started.'
			);
		}
	})
	.action(async (strings: string[], options?: { gpt4?: boolean }) => {
		if (context.stdin) {
			runCmd.error(
				'hey, does not support piping data to "hey, run". Please use "hey, run" without piping data. Or use "hey, explain"'
			);
			return;
		}
		let instruction: string;
		if (!strings || strings.length === 0) {
			const { input } = await enquirer.prompt<{ input: string }>({
				type: 'input',
				name: 'input',
				message: '->',
				required: true,
			});
			instruction = input;
		} else {
			instruction = strings.join(' ');
		}

		const spinner = ora('Thinking');

		async function getCommand() {
			spinner.start();

			let command: string | null = null;

			command = cache.get(instruction);
			if (command) {
				spinner.stop();
				console.log('Using command from cache:');
			}

			if (!command) {
				const prompt = prompts.terminalCommand(instruction);

				const {
					success,
					error,
					answer: _command,
				} = await askAi(prompt, {
					overrideModel: options?.gpt4 ? 'gpt-4' : undefined,
				});

				if (!success) {
					runCmd.error(error);
					return;
				}

				command = _command.trim().replace(/(^\n)|(\n$)/g, '');

				if (!command) {
					spinner.stop();
					runCmd.error('No command generated.');
					return;
				}
			}

			spinner.stop();

			console.log(command);

			let option: 'yes' | 'cancel' | 'retry' | 'edit';

			try {
				const res = await enquirer.prompt<{
					option: 'yes' | 'cancel' | 'retry' | 'edit';
				}>({
					type: 'autocomplete',
					name: 'option',
					message: 'Execute command?',
					choices: [
						{ name: 'yes' },
						{
							name: 'retry',
							hint: '- create a new command with the same instruction',
						},
						{ name: 'edit', hint: '- edit command before executing' },
						{ name: 'cancel' },
					],
				});
				option = res.option;
			} catch {
				runCmd.error('Cancelled');
				return;
			}

			if (option === 'edit') {
				const readline = createInterface({
					input: process.stdin,
					output: process.stdout,
				});
				readline.write(command);
				const editedCommand = await readline.question('');
				readline.close();

				if (editedCommand) {
					command = editedCommand;
				} else {
					runCmd.error('No command entered');
					return;
				}

				option = 'yes';
			}

			if (option === 'retry') {
				cache.delete(instruction);
				await getCommand();
				return;
			}

			// execute command
			if (option === 'yes') {
				// make type checker happy
				const _command = command;
				exec(_command, (error, stdout, stderr) => {
					if (error) {
						runCmd.error(`${error.message}`);
						cache.delete(instruction);
						return;
					}
					if (stderr) {
						runCmd.error(`${stderr}`);
						cache.delete(instruction);
						return;
					}

					cache.set(instruction, _command);

					console.log(`${stdout}`);
				});
			}
		}

		await getCommand();
	});

runCmd.addHelpText(
	'after',
	`

Examples:
	$ hey, run "create a file"
	$ hey, cleanup the npm cache
`
);

export default runCmd;
