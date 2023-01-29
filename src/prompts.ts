import { userInfo } from 'node:os';

const shell = userInfo().shell;

export const prompts = {
	terminalCommand: (instruction: string) =>
		`Only answer with a terminal command that can be executed as is. The command has to be executed in a ${shell} shell.\n${instruction}`,
	explanation: (context: string, instruction: string) =>
		`${context}\n\n${instruction}\nGive a short answer.`,
};
