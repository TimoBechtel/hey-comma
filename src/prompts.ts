import { userInfo } from 'node:os';

const shell = userInfo().shell;

export const prompts = {
	terminalCommand: (instruction: string) =>
		`Please only answer with a single-line terminal command that I can copy and paste into my terminal. Do not add quotation marks. The command has to be executed in a ${shell} shell.\n${instruction}`,
	explanation: (context: string, instruction: string) =>
		`${context}\n\n${instruction}\nPlease give a short answer.`,
};
