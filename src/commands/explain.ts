import { Command } from 'commander';
import ora from 'ora';
import { config } from '../config.js';
import { context } from '../context.js';
import { askAi } from '../openai.js';
import { prompts } from '../prompts.js';
import { isConfigured } from '../setup.js';

const program = new Command();

const explainCmd = program
  .command('explain')
  .alias('explain:')
  .description(
    'pipe data to "hey," to ask questions about it. e.g. `cat script.sh | hey, explain`.',
  )
  .argument('[question...]', 'optional question')
  .option('--gpt4', 'use the GPT-4 model')
  .hook('preAction', (command) => {
    if (!isConfigured()) {
      command.error(
        'hey, is not configured yet. Run `hey, setup` to get started.',
      );
    }
  })
  .action(async (strings?: string[], options?: { gpt4?: boolean }) => {
    const question =
      !strings || strings.length === 0 ? 'What is this?' : strings.join(' ');

    const spinner = ora('Thinking').start();

    const input = context.stdin;

    if (!input) {
      spinner.stop();
      explainCmd.error(
        'No input provided. Please pipe data to "hey,". e.g. `cat script.sh | hey, explain`',
      );
      return;
    }

    const customPrompt = config.get('explain_prompt');
    const prompt = prompts.explanation({
      context: input,
      instruction: question,
      customTemplate: customPrompt,
    });

    const maxTokens = config.get('max_tokens');
    const temperature = config.get('temperature');

    const { success, error, answer } = await askAi(prompt, {
      overrideModel: options?.gpt4 ? 'gpt-4' : undefined,
      maxTokens,
      temperature,
    });

    if (!success) {
      spinner.stop();
      explainCmd.error(error);
      return;
    }

    spinner.stop();

    console.info(answer);
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
`,
);

export default explainCmd;
