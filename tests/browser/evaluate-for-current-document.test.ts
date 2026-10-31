import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect } from '@rstest/playwright';
import { isPageDocumentEquivalentToSvgSource } from '../../src/private/testing/assertions/page-document-equivalence';
import {
  consoleExceptionsToString,
  consoleMessagesToString,
} from '../../src/private/testing/browser-console-helpers';
import { testWithTemporaryDirectoryFixture } from '../../src/private/testing/fixtures/test-with-temporary-directory';
import { serveGeneratedDirectory } from '../../src/private/testing/serve-generated-directory';

const EVALUATE_SCRIPT_BASENAME = 'evaluate-for-current-document.js';
const EVALUATE_SCRIPT_DIST_PATH = `./dist/${EVALUATE_SCRIPT_BASENAME}`;
const EVALUATE_SCRIPT_HREF = EVALUATE_SCRIPT_BASENAME;
const TEMP_DIR = 'tmp';

const testWithTemporaryDirectory = testWithTemporaryDirectoryFixture({
  temporaryDirectoryRoot: TEMP_DIR,
  autoClean: true,
});

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
        expect(await page.consoleMessages()).toEqual([]);
        expect(await page.pageErrors()).toEqual([]);
      } catch (e) {
        console.log(
          `Browser console messages:\n${consoleMessagesToString(await page.consoleMessages())}`,
        );
        console.log(
          `Browser console exceptions:\n${consoleExceptionsToString(await page.pageErrors())}`,
        );
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

      if (!(await fs.stat(expectedOutputFilePath)).isFile()) {
        continue;
      }

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
        expect(await page.consoleMessages()).toEqual([]);
        expect(await page.pageErrors()).toEqual([]);
      } catch (e) {
        console.log(
          `Console messages:\n${consoleMessagesToString(await page.consoleMessages())}`,
        );
        console.log(
          `Page exceptions:\n${consoleExceptionsToString(await page.pageErrors())}`,
        );
        throw e;
      }
    },
  );

  testWithTemporaryDirectory(
    'live update responds to style change on focus',
    async ({ page, serve, temporaryDirectory }) => {
      // Setup:
      const { baseUrl } = await serveGeneratedDirectory(
        serve,
        temporaryDirectory,
        {
          [EVALUATE_SCRIPT_BASENAME]: { path: EVALUATE_SCRIPT_DIST_PATH },
          'document.svg': {
            path: path.join(
              assetsDir,
              'test-live-update-responds-to-style-change-on-focus.svg',
            ),
          },
        },
      );
      const pageUrl = `${baseUrl}/document.svg`;

      // Act:
      await page.goto(pageUrl);
      await page.waitForLoadState();
      const startViewBox = await page.locator('svg').getAttribute('viewBox');
      await page.getByText('La belle').and(page.locator('text')).focus();
      await expect(
        page.getByText('La belle').and(page.locator('text')),
      ).toBeFocused();
      const endViewBox = await page.locator('svg').getAttribute('viewBox');

      // Verify:
      try {
        expect(startViewBox).toEqual('-90 -51 180 65');
        expect(endViewBox).toEqual('-112 -64 225 82');
        expect(await page.pageErrors()).toEqual([]);
      } catch (e) {
        console.log(
          `Browser console messages:\n${consoleMessagesToString(await page.consoleMessages())}`,
        );
        console.log(
          `Browser console exceptions:\n${consoleExceptionsToString(await page.pageErrors())}`,
        );
        throw e;
      }
    },
  );
});
