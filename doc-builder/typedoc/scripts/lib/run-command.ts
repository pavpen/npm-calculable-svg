import child_process from 'node:child_process';
import events from 'node:events';
import { WritableStringBuffer } from './writable-string-buffer.ts';

export const runCommand = async (
  command: string[],
  options?: { cwd?: string; env?: Record<string, string>; shell?: boolean },
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const spawnOptions = typeof options === 'undefined' ? {} : options;
  const stdoutBuffer = new WritableStringBuffer({ emitClose: true });
  const stderrBuffer = new WritableStringBuffer({ emitClose: true });

  try {
    const childProcess = child_process.spawn(
      command[0],
      command.slice(1),
      spawnOptions,
    );
    childProcess.stdout.pipe(stdoutBuffer);
    childProcess.stderr.pipe(stderrBuffer);
    const [exitCode] = await events.once(childProcess, 'close');
    if (exitCode !== 0) {
      throw new Error(
        `Sub-command ${JSON.stringify(command)} \
(with execution options ${JSON.stringify(options)}) terminated with exit code ${exitCode}!
StdOut: ${JSON.stringify(stdoutBuffer.toString())}
StdErr: ${JSON.stringify(stderrBuffer.toString())}
`,
      );
    }

    if (!stdoutBuffer.closed) {
      await events.once(stdoutBuffer, 'close');
    }
    if (!stderrBuffer.closed) {
      await events.once(stderrBuffer, 'finish');
    }

    return {
      stdout: stdoutBuffer.toString(),
      stderr: stderrBuffer.toString(),
      exitCode,
    };
  } catch (e) {
    console.error('Executing command failed!', {
      command,
      options,
      stdout: stdoutBuffer.toString(),
      stderr: stderrBuffer.toString(),
    });
    throw e;
  }
};
