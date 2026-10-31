import type { ConsoleMessage } from 'playwright';

export const consoleMessagesToString = (consoleMessages: ConsoleMessage[]) =>
  consoleMessages
    .map(
      (m) =>
        `[${m.location().lineNumber}:${m.location().column} ${m.type()} ${m.location().url}] ${m.text()}`,
    )
    .join('\n');

export const consoleExceptionToString = (consoleException: Error): string => {
  const cause = consoleException.cause;
  const causeMessage = cause
    ? `\ncaused by ${consoleExceptionToString(cause as Error)}`
    : '';
  const stackMessage = consoleException.stack
    ? `\n\n* Stack trace:\n${consoleException.stack}`
    : '';

  return `[Exception ${consoleException.name}] ${consoleException.message}${causeMessage}${stackMessage}`;
};

export const consoleExceptionsToString = (consoleExceptions: Error[]): string =>
  consoleExceptions.map(consoleExceptionToString).join('\n\n');
