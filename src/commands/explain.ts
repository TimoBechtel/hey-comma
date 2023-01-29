import { Command } from 'commander';
import ora from 'ora';
import { context } from '../context.js';
import { askAi } from '../openai.js';
import { prompts } from '../prompts.js';
import { isConfigured } from '../setup.js';

const program = new Command();

const explainCmd = program
	.command('explain')
	.alias('explain:')
	.description(
		'pipe data to "hey," to ask questions about it. e.g. `cat script.sh | hey, explain`.'
	)
	.argument('[question...]', 'optional question')
	.hook('preAction', (command) => {
		if (!isConfigured()) {
			command.error(
				'hey, is not configured yet. Run `hey, setup` to get started.'
			);
		}
	})
	.action(async (strings?: string[]) => {
		let question: string;
		if (!strings || strings.length === 0) {
			question = 'What is this?';
		} else {
			question = strings.join(' ');
		}

		const spinner = ora('Thinking').start();

		const input = context.stdin;

		if (!input) {
			spinner.stop();
			explainCmd.error(
				'No input provided. Please pipe data to "hey,". e.g. `cat script.sh | hey, explain`'
			);
			return;
		}

		const prompt = prompts.explanation(input, question);

		const { success, error, answer } = await askAi(prompt);

		if (!success) {
			spinner.stop();
			explainCmd.error(error);
			return;
		}

		spinner.stop();

		console.log(answer);
	});

explainCmd.addHelpText(
	'after',
	`
Note: The piped data will be transmitted to OpenAI. Only use this command with data you are comfortable sharing with OpenAI.

Examples:
	$ cat scripts | hey, is this safe to run
	$ echo "rm -rf /" | hey, explain: what does this do
	$ ls | hey,
	$ cat README.md | hey, how do i install this
`
);

export default explainCmd;
