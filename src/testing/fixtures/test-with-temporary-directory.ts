import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Use } from '@rstest/core';
import {
  type PlaywrightFixture,
  type PlaywrightTest,
  test,
} from '@rstest/playwright';

export const testWithTemporaryDirectoryFixture = ({
  temporaryDirectoryRoot,
  parentTest,
  autoClean,
}: {
  temporaryDirectoryRoot: string;
  parentTest?: PlaywrightTest<PlaywrightFixture, object, object>;
  autoClean?: boolean;
}) =>
  (parentTest ?? test).extend({
    temporaryDirectory: async (_context, use: Use<string>) => {
      // Setup before running the test case:
      mkdirSync(temporaryDirectoryRoot, { recursive: true });
      const directory = mkdtempSync(
        join(temporaryDirectoryRoot, 'evaluate-for-current-document.test-'),
      );

      // Pass the fixture to the test:
      await use(directory);

      // Tear down:
      if (autoClean ?? true) {
        rmSync(directory, { recursive: true });
      }
    },
  });
