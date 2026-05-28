import { Command } from 'commander';

const program = new Command();

const shellIntegrationCmd = program
  .command('shell-integration <shell>')
  .description('print shell integration')
  .addHelpText(
    'after',
    `
Examples:
  $ eval "$(hey, shell-integration zsh)"
  $ eval "$(hey, shell-integration bash)"
`,
  )
  .action((shell: string) => {
    if (shell !== 'bash' && shell !== 'zsh') {
      shellIntegrationCmd.error('Supported shells: bash, zsh');
      return;
    }

    console.info(integrationScript(shell));
  });

function integrationScript(shell: 'bash' | 'zsh') {
  const addHistory = shell === 'zsh' ? 'print -s "$cmd"' : 'history -s "$cmd"';

  return `__hey_run_current_shell() {
  local binary file cmd exit_code
  binary="$1"
  shift

  file="$(mktemp)" || return

  HEY_COMMAND_OUTPUT_FILE="$file" command "$binary" "$@"
  exit_code=$?

  if [ "$exit_code" -ne 0 ] || [ ! -s "$file" ]; then
    rm -f "$file"
    return "$exit_code"
  fi

  cmd="$(cat "$file")"
  rm -f "$file"

  ${addHistory}
  eval "$cmd"
}

hey,() {
  __hey_run_current_shell "hey," "$@"
}

hey() {
  __hey_run_current_shell "hey" "$@"
}`;
}

export default shellIntegrationCmd;
