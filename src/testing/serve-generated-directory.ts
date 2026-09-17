import { copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { PlaywrightServe } from '@rstest/playwright';

export type ServeDirectoryEntryContent =
  | { path: string }
  | { fileContents: string };

/**
 * Generates a directory according to a descriptions, and serves to unit test
 * using an '@rstest/playwright' {@link PlaywrightServe} fixture
 *
 * See
 * [Rstest Playwright, Local app server](https://rstest.rs/integration/playwright#local-app-server).
 */
export const serveGeneratedDirectory = async (
  serve: PlaywrightServe,
  serverBaseDirectory: string,
  directoryEntries: Record<string, ServeDirectoryEntryContent>,
): Promise<{ baseUrl: string }> => {
  for (const [relativePath, contentSpec] of Object.entries(directoryEntries)) {
    const outputPath = path.join(serverBaseDirectory, relativePath);
    if ('path' in contentSpec) {
      copyFileSync(contentSpec.path, outputPath);
    } else {
      writeFileSync(outputPath, contentSpec.fileContents, 'utf-8');
    }
  }

  const { url } = await serve(serverBaseDirectory);

  return { baseUrl: url };
};
