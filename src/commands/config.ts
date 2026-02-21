import { Command } from 'commander';
import { config, configPath } from '../config.js';

const program = new Command();

const configCmd = program.command('config').description('configure hey,');

function parseConfigValue(value: string) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (value.trim() !== '') {
    const number = Number(value);

    if (!Number.isNaN(number)) {
      return number;
    }
  }

  return value;
}

configCmd
  .command('set <key> <value>')
  .description('set a configuration value')
  .action((key: string, value: string) => {
    try {
      config.set(key, parseConfigValue(value));
    } catch (error) {
      console.error((error as Error).message);
    }
  });

configCmd
  .command('get [key]')
  .description('get a configuration value')
  .action((key?: string) => {
    if (key) {
      console.info(JSON.stringify(config.get(key), null, 2));
    } else {
      console.info(JSON.stringify(config.store, null, 2));
    }
  });

configCmd
  .command('path')
  .description('print the path to the configuration files')
  .action(() => {
    console.info(configPath);
  });

export default configCmd;
