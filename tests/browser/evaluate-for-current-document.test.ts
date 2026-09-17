import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect } from '@rstest/playwright';
import type { ConsoleMessage, Page } from 'playwright';
import { isPageDocumentEquivalentToSvgSource } from '../../src/testing/assertions/page-document-equivalence';
import { testWithTemporaryDirectoryFixture } from '../../src/testing/fixtures/test-with-temporary-directory';
import { serveGeneratedDirectory } from '../../src/testing/serve-generated-directory';

const EVALUATE_SCRIPT_BASENAME = 'evaluate-for-current-document.js';
const EVALUATE_SCRIPT_DIST_PATH = `./dist/${EVALUATE_SCRIPT_BASENAME}`;
const EVALUATE_SCRIPT_HREF = EVALUATE_SCRIPT_BASENAME;
const TEMP_DIR = 'tmp';

const testWithTemporaryDirectory = testWithTemporaryDirectoryFixture({
  temporaryDirectoryRoot: TEMP_DIR,
  autoClean: true,
});

/**
 * Collect console messages from a Playwright browser page in an array
 */
const collectPageConsoleMessages: (
  page: Page,
  outputContainer: ConsoleMessage[],
) => void = (page, outputContainer) => {
  page.on('console', (msg) => {
    outputContainer.push(msg);
  });
};

const consoleMessagesToString = (consoleMessages: ConsoleMessage[]) =>
  consoleMessages
    .map(
      (m) =>
        `[${m.location().lineNumber}:${m.location().column} ${m.type()} ${m.location().url}] ${m.text()}`,
    )
    .join('\n');

describe('<script href="evaluate-for-current-document.js"/>', async () => {
  testWithTemporaryDirectory(
    'leaves non-calculable SVG unchanged',
    async ({ page, serve, temporaryDirectory }) => {
      // Setup:
      const nonCalculableSvgSource = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-215.73114013671875 -326.3367864150494 431.4622802734375 386.3367864150494">
    <title>The title 'Title', followed by the subtitle 'Beware of titles' inside a triangular warning-sign border</title>
    <script crossorigin="anonymous" href="${EVALUATE_SCRIPT_HREF}"></script>
    <g>
        <path class="outline" d="M-185.73114291981824,30 L0,-291.6957760849617 L185.73114291981824,30 z"/>
        <g>
            <text class="title" text-anchor="middle" y="-65">Title</text>
            <text class="subtitle" text-anchor="middle" y="-15">Beware of titles</text>
        </g>
    </g>
</svg>
`.trim();

      const { baseUrl } = await serveGeneratedDirectory(
        serve,
        temporaryDirectory,
        {
          [EVALUATE_SCRIPT_BASENAME]: { path: EVALUATE_SCRIPT_DIST_PATH },
          'document.svg': { fileContents: nonCalculableSvgSource },
        },
      );
      const pageUrl = `${baseUrl}/document.svg`;
      const consoleMessages: ConsoleMessage[] = [];
      collectPageConsoleMessages(page, consoleMessages);

      // Act:
      await page.goto(pageUrl);
      await page.waitForLoadState();

      // Verify:
      try {
        expect(
          await isPageDocumentEquivalentToSvgSource(
            page,
            nonCalculableSvgSource,
          ),
        ).toBeTrue();
        expect(consoleMessages).toHaveLength(0);
      } catch (e) {
        console.log(`Browser console messages:
${consoleMessagesToString(consoleMessages)}
`);
        throw e;
      }
    },
  );

  const testCaseFiles: Array<{
    testName: string;
    inputFilePath: string;
    expectedOutputFilePath: string;
  }> = [];
  const inputFileNamePrefix = 'test-';
  const inputFileNameSuffix = '.input.svg';
  const assetsDir = path.resolve(__dirname, 'assets');
  for (const entry of await fs.readdir(assetsDir, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      entry.name.startsWith(inputFileNamePrefix) &&
      entry.name.endsWith(inputFileNameSuffix)
    ) {
      const inputFilePath = path.join(assetsDir, entry.name);
      const testFileNameRoot = entry.name.substring(
        0,
        entry.name.length - inputFileNameSuffix.length,
      );
      const expectedOutputFileName = `${testFileNameRoot}.expected-output.svg`;
      const expectedOutputFilePath = path.join(
        assetsDir,
        expectedOutputFileName,
      );
      const testName = testFileNameRoot
        .substring(inputFileNamePrefix.length)
        .replaceAll('-', ' ');

      testCaseFiles.push({ testName, inputFilePath, expectedOutputFilePath });
    }
  }

  testWithTemporaryDirectory.for(testCaseFiles)(
    '$testName',
    async (
      { inputFilePath, expectedOutputFilePath },
      { page, serve, temporaryDirectory },
    ) => {
      const expectedSvgProcessedSource = await fs.readFile(
        expectedOutputFilePath,
        { encoding: 'utf-8' },
      );
      const { baseUrl } = await serveGeneratedDirectory(
        serve,
        temporaryDirectory,
        {
          [EVALUATE_SCRIPT_BASENAME]: { path: EVALUATE_SCRIPT_DIST_PATH },
          'document.svg': { path: inputFilePath },
        },
      );
      const pageUrl = `${baseUrl}/document.svg`;
      const consoleMessages: ConsoleMessage[] = [];
      collectPageConsoleMessages(page, consoleMessages);

      // Act:
      await page.goto(pageUrl);
      await page.waitForLoadState();

      // Verify:
      try {
        expect(
          await isPageDocumentEquivalentToSvgSource(
            page,
            expectedSvgProcessedSource,
          ),
        ).toBeTrue();
        expect(consoleMessages).toHaveLength(0);
      } catch (e) {
        console.log(
          `Console messages:\n${consoleMessagesToString(consoleMessages)}`,
        );
        throw e;
      }
    },
  );
});
