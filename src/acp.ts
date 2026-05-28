import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Readable } from 'node:stream';
import {
  ClientSideConnection,
  ndJsonStream,
  type PermissionOption,
  type RequestPermissionRequest,
  type SessionNotification,
} from '@agentclientprotocol/sdk';
import { parseArgsStringToArgv } from 'string-argv';
import { config, defaultConfig, type AcpClientConfig } from './config.js';

type AcpPromptOptions = {
  argGroups?: string[];
  client: string;
  onPermissionRequest?: (
    request: AcpPermissionRequest,
  ) => AcpPermissionDecision | Promise<AcpPermissionDecision>;
  onProgress?: (message: string) => void;
  prompt: string;
};

export type AcpPermissionDecision = 'allow' | 'deny';

export type AcpPermissionRequest = {
  title: string;
};

export async function runAcpPrompt({
  argGroups = [],
  client,
  onPermissionRequest,
  onProgress,
  prompt,
}: AcpPromptOptions) {
  const clientConfig = resolveAcpClient(client);
  const { child, getStderrTail } = await spawnAcpClient({
    command: clientConfig.command,
    args: [
      ...expandArgGroups(clientConfig.args),
      ...expandArgGroups(argGroups),
    ],
    env: clientConfig.env,
  });

  let answer = '';

  const connection = new ClientSideConnection(
    () => ({
      requestPermission: async (request) =>
        resolvePermission(request, onPermissionRequest),
      sessionUpdate: (notification) => {
        const text = getTextDelta(notification);
        if (text) {
          answer += text;
        }

        const progress = getProgressMessage(notification);
        if (progress) {
          onProgress?.(progress);
        }

        return Promise.resolve();
      },
    }),
    ndJsonStream(createStdinStream(child), createStdoutStream(child)),
  );

  try {
    await withTimeout(
      connection.initialize({
        protocolVersion: 1,
        clientCapabilities: {},
        clientInfo: {
          name: 'hey-comma',
          title: 'hey,',
          version: '0.0.0',
        },
      }),
      `${client} did not respond to initialize within 30000ms`,
    );

    const session = await connection.newSession({
      cwd: process.cwd(),
      mcpServers: [],
    });

    const result = await connection.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: 'text', text: prompt }],
    });

    return {
      text: answer.trim(),
      stopReason: result.stopReason,
    };
  } catch (error) {
    const stderr = getStderrTail().trim();
    const message =
      error instanceof Error ? error.message : 'ACP client failed.';

    throw new Error(stderr ? `${message}\n${stderr}` : message);
  } finally {
    await closeChild(child);
  }
}

function resolveAcpClient(client: string): Required<AcpClientConfig> {
  const configuredClients = config.get('acp', defaultConfig.acp).clients ?? {};
  const defaultClients: Record<string, AcpClientConfig> =
    defaultConfig.acp.clients;
  const clientConfig = {
    ...defaultClients[client],
    ...configuredClients[client],
  };

  if (!clientConfig.command) {
    throw new Error(`Unknown ACP client "${client}".`);
  }

  return {
    args: clientConfig.args ?? [],
    command: clientConfig.command,
    env: clientConfig.env ?? {},
  };
}

function expandArgGroups(argGroups: string[]) {
  return argGroups.flatMap((argGroup) => {
    const trimmed = argGroup.trim();

    return trimmed ? parseArgsStringToArgv(trimmed) : [];
  });
}

async function spawnAcpClient({
  args,
  command,
  env,
}: {
  args: string[];
  command: string;
  env: Record<string, string>;
}) {
  const child = spawn(command, args, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stderrTail = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderrTail = `${stderrTail}${chunk.toString('utf8')}`.slice(-4000);
  });

  await new Promise<void>((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });

  return {
    child,
    getStderrTail: () => stderrTail,
  };
}

function createStdinStream(child: ChildProcessWithoutNullStreams) {
  return new WritableStream<Uint8Array>({
    write: (chunk) =>
      new Promise<void>((resolve, reject) => {
        child.stdin.write(chunk, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    close: () =>
      new Promise<void>((resolve) => {
        child.stdin.end(resolve);
      }),
  });
}

function createStdoutStream(child: ChildProcessWithoutNullStreams) {
  return Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>;
}

async function resolvePermission(
  request: RequestPermissionRequest,
  onPermissionRequest?: (
    request: AcpPermissionRequest,
  ) => AcpPermissionDecision | Promise<AcpPermissionDecision>,
) {
  const decision = onPermissionRequest
    ? await onPermissionRequest({
        title: request.toolCall.title ?? 'Tool request',
      })
    : 'allow';

  const option =
    decision === 'allow'
      ? findPermissionOption(request.options, ['allow_once', 'allow_always'])
      : findPermissionOption(request.options, ['reject_once', 'reject_always']);

  if (!option) {
    return {
      outcome: {
        outcome: 'cancelled' as const,
      },
    };
  }

  return {
    outcome: {
      outcome: 'selected' as const,
      optionId: option.optionId,
    },
  };
}

function findPermissionOption(
  options: PermissionOption[],
  kinds: PermissionOption['kind'][],
) {
  for (const kind of kinds) {
    const option = options.find((candidate) => candidate.kind === kind);

    if (option) {
      return option;
    }
  }

  return undefined;
}

function getTextDelta({ update }: SessionNotification) {
  if (update.sessionUpdate !== 'agent_message_chunk') {
    return '';
  }

  return update.content.type === 'text' ? update.content.text : '';
}

function getProgressMessage({ update }: SessionNotification) {
  if (update.sessionUpdate === 'agent_thought_chunk') {
    const text = update.content.type === 'text' ? update.content.text : '';

    return compactProgress(text);
  }

  if (update.sessionUpdate === 'tool_call') {
    return compactProgress(update.title);
  }

  if (update.sessionUpdate === 'tool_call_update' && update.title) {
    return compactProgress(update.title);
  }

  return null;
}

function compactProgress(text: string) {
  return text.trim().replaceAll(/\s+/g, ' ').slice(0, 120);
}

async function withTimeout<T>(promise: Promise<T>, message: string) {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(message));
        }, 30_000);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function closeChild(child: ChildProcessWithoutNullStreams) {
  if (!isChildRunning(child)) {
    return;
  }

  child.kill('SIGTERM');

  await Promise.race([
    new Promise<void>((resolve) => {
      child.once('close', () => {
        resolve();
      });
    }),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    }),
  ]);

  if (isChildRunning(child)) {
    child.kill('SIGKILL');
  }
}

function isChildRunning(child: ChildProcessWithoutNullStreams) {
  return child.exitCode === null && child.signalCode === null;
}
