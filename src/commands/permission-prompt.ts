import { closeSync, openSync, readSync, writeSync } from 'node:fs';
import type { AiPermissionDecision } from '../ai.js';

export function promptPermissionDecision() {
  const input = process.stdin.isTTY
    ? process.stdin.fd
    : openSync('/dev/tty', 'r');
  const output = process.stdout.isTTY
    ? process.stdout.fd
    : openSync('/dev/tty', 'w');

  try {
    writeSync(output, '? Allow this action? [Y/n] ');

    const answer = readLine(input, output).trim().toLowerCase();
    return (
      answer === 'n' || answer === 'no' ? 'deny' : 'allow'
    ) satisfies AiPermissionDecision;
  } finally {
    if (input !== process.stdin.fd) {
      closeFile(input);
    }

    if (output !== process.stdout.fd) {
      closeFile(output);
    }
  }
}

function readLine(input: number, output: number) {
  const buffer = Buffer.alloc(1);
  let line = '';

  while (readSync(input, buffer, 0, 1, null) > 0) {
    const char = buffer.toString('utf8');

    if (char === '\n' || char === '\r') {
      writeSync(output, '\n');
      break;
    }

    line += char;
  }

  return line;
}

function closeFile(fileDescriptor: number) {
  try {
    closeSync(fileDescriptor);
  } catch {
    // The fd is process-owned or already closed.
  }
}
