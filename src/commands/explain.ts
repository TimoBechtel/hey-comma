import { Command } from 'commander';
import ora from 'ora';
import { askAi } from '../ai.js';
import { config } from '../config.js';
import { context } from '../context.js';
import { prompts } from '../prompts.js';
import { isConfigured } from '../setup.js';
import { collectCodexConfig, type AiCommandOptions } from './options.js';
import { promptPermissionDecision } from './permission-prompt.js';

const program = new Command();

const explainCmd = program
  .command('explain')
  .alias('explain:')
  .description(
    'pipe data to "hey," to ask questions about it. e.g. `cat script.sh | hey, explain`.',
  )
  .argument('[question...]', 'optional question')
  .option('--model <model>', 'model selector or alias')
  .option(
    '--codex-config <key=value>',
    'Codex config override for spawn-agent/codex',
    collectCodexConfig,
  )
  .hook('preAction', (command) => {
    if (!isConfigured()) {
      command.error(
        'hey, is not configured yet. Run `hey, setup` to get started.',
      );
    }
  })
  .action(async (strings?: string[], options?: AiCommandOptions) => {
    const question =
      !strings || strings.length === 0 ? 'What is this?' : strings.join(' ');

    const spinner = ora({
      text: 'Thinking',
      discardStdin: false,
      hideCursor: false,
    }).start();

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
      codexConfig: options?.codexConfig,
      overrideModel: options?.model,
      maxTokens,
      onProgress: (message) => {
        spinner.text = message;
      },
      onPermissionRequest: ({ title }) => {
        spinner.stop();
        console.info(`\nAgent wants to use: ${title}`);

        try {
          return promptPermissionDecision();
        } finally {
          spinner.start();
        }
      },
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
