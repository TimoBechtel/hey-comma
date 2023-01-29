import { Command } from 'commander';
import { setup } from '../setup.js';

const program = new Command();
const setupCmd = program
	.command('setup')
	.description('setup hey,')
	.action(async () => {
		try {
			await setup();
		} catch {
			setupCmd.error('Cancelled');
		}
	});

export default setupCmd;
