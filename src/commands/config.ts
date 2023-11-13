import { Command } from 'commander';
import { config, configPath } from '../config.js';

const program = new Command();

const configCmd = program.command('config').description('configure hey,');

configCmd
  .command('set <key> <value>')
  .description('set a configuration value')
  .action((key: string, value: string) => {
    try {
      config.set(key, value);
    } catch (error) {
      console.error((error as Error).message);
    }
  });

configCmd
  .command('get [key]')
  .description('get a configuration value')
  .action((key?: string) => {
    if (key) {
      console.info(config.get(key));
    } else {
      console.info(config.store);
    }
  });

configCmd
  .command('path')
  .description('print the path to the configuration files')
  .action(() => {
    console.info(configPath);
  });

export default configCmd;
