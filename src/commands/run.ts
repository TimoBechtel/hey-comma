import { exec } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { Command } from 'commander';
import enquirer from 'enquirer';
import ora from 'ora';
import { askAi } from '../ai.js';
import { cache } from '../cache.js';
import { config } from '../config.js';
import { context } from '../context.js';
import { prompts } from '../prompts.js';
import { isConfigured } from '../setup.js';
import { promptPermissionDecision } from './permission-prompt.js';

type AiCommandOptions = {
  acpArgs?: string[];
  model?: string;
};

const program = new Command();
const runCmd = program
  .command('run')
  .alias('run:')
  .description('create a shell command from an instruction (default)')
  .argument('[instruction...]', 'instruction')
  .option('--model <model>', 'model selector or alias')
  .option(
    '--acp-args <args>',
    'extra argument group for acp/<client>',
    (value, previous?: string[]) => [...(previous ?? []), value],
  )
  .hook('preAction', (command) => {
    if (!isConfigured()) {
      command.error(
        'hey, is not configured yet. Run `hey, setup` to get started.',
      );
    }
  })
  .action(async (strings?: string[], options?: AiCommandOptions) => {
    if (context.stdin) {
      runCmd.error(
        'hey, does not support piping data to "hey, run". Please use "hey, run" without piping data. Or use "hey, explain"',
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

    const spinner = ora({
      text: 'Thinking',
      discardStdin: false,
      hideCursor: false,
    });

    const baseInstruction = instruction;

    async function generateCommand({
      refine,
    }: {
      refine?: {
        previousCommand: string;
        refineText: string;
      };
    } = {}): Promise<string | null> {
      spinner.start();

      let command: string | null = null;

      if (!refine) {
        command = cache.get(baseInstruction);
        if (command) {
          spinner.stop();
          console.info('Using command from cache:');
        }
      }

      if (!command) {
        const customPrompt = config.get('run_prompt');
        const promptInstruction = refine
          ? [
              'Original instruction:',
              baseInstruction,
              'Previous command:',
              refine.previousCommand,
              'Refine request:',
              refine.refineText,
            ].join('\n')
          : baseInstruction;
        const prompt = prompts.terminalCommand({
          instruction: promptInstruction,
          customTemplate: customPrompt,
        });

        const maxTokens = config.get('max_tokens');
        const temperature = config.get('temperature');

        const {
          success,
          error,
          answer: generatedCommand,
        } = await askAi(prompt, {
          acpArgs: options?.acpArgs,
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

        spinner.stop();

        if (!success) {
          runCmd.error(error);
          return null;
        }

        command = extractCommand(generatedCommand);

        if (command.length === 0) {
          runCmd.error('No command generated.');
          return null;
        }
      }

      spinner.stop();

      return command;
    }

    let command = await generateCommand();
    if (command === null) {
      return;
    }

    for (;;) {
      console.info(command);

      let option: 'run' | 'cancel' | 'refine' | 'edit';

      try {
        const res = await enquirer.prompt<{
          option: 'run' | 'cancel' | 'refine' | 'edit';
        }>({
          type: 'autocomplete',
          name: 'option',
          message: 'Execute command?',
          choices: [
            { name: 'run' },
            { name: 'edit', hint: '- edit command before executing' },
            { name: 'refine', hint: '- refine and regenerate command' },
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

        option = 'run';
      }

      if (option === 'refine') {
        let refineText: string;
        try {
          const res = await enquirer.prompt<{ refine: string }>({
            type: 'input',
            name: 'refine',
            message: 'Refine: ',
            required: true,
          });
          refineText = res.refine;
        } catch {
          runCmd.error('Cancelled');
          return;
        }

        const refinedCommand = await generateCommand({
          refine: {
            previousCommand: command,
            refineText,
          },
        });
        if (refinedCommand === null) {
          return;
        }

        command = refinedCommand;
        continue;
      }

      if (option === 'cancel') {
        runCmd.error('Cancelled');
        return;
      }

      const commandToRun = command;
      const commandOutputFile = process.env.HEY_COMMAND_OUTPUT_FILE;

      if (commandOutputFile) {
        writeFileSync(commandOutputFile, `${commandToRun}\n`);
        return;
      }

      exec(commandToRun, (error, stdout, stderr) => {
        if (error) {
          runCmd.error(error.message);
          cache.delete(baseInstruction);
          return;
        }
        if (stderr) {
          runCmd.error(stderr);
          cache.delete(baseInstruction);
          return;
        }

        cache.set(baseInstruction, commandToRun);

        console.info(stdout);
      });
      return;
    }
  });

runCmd.addHelpText(
  'after',
  `

Examples:
	$ hey, run "create a file"
	$ hey, cleanup the npm cache
`,
);

export default runCmd;

function extractCommand(answer: string) {
  const taggedCommand = /<command>\s*([\s\S]*?)\s*<\/command>/.exec(answer);

  return (taggedCommand?.[1] ?? answer).trim().replaceAll(/(^\n)|(\n$)/g, '');
}
