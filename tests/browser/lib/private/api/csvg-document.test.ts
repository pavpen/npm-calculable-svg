import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect } from '@rstest/playwright';
import type { CsvgDocument } from '../../../../../src/lib/api/csvg-document';
import {
  consoleExceptionsToString,
  consoleMessagesToString,
} from '../../../../../src/private/testing/browser-console-helpers';
import { testWithTemporaryDirectoryFixture } from '../../../../../src/private/testing/fixtures/test-with-temporary-directory';
import { serveGeneratedDirectory } from '../../../../../src/private/testing/serve-generated-directory';

type CsvgLibrary = {
  CsvgDocument: typeof CsvgDocument;
};

const EVALUATE_SCRIPT_BASENAME = 'evaluate-for-current-document.js';
const EVALUATE_SCRIPT_DIST_PATH = `./dist/${EVALUATE_SCRIPT_BASENAME}`;
const LIBRARY_JS_DIST_PATH = './dist/umd/index.js';
const TEMP_DIR = 'tmp';

const testWithTemporaryDirectory = testWithTemporaryDirectoryFixture({
  temporaryDirectoryRoot: TEMP_DIR,
  autoClean: true,
});

describe(`<script href="${EVALUATE_SCRIPT_BASENAME}"/>`, async () => {
  const assetsDir = path.resolve(__dirname, '../../../assets');
  const libraryJsContent = (await fs.readFile(LIBRARY_JS_DIST_PATH)).toString();

  describe('CsvgDocument', async () => {
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

    describe('stopLiveUpdate', () => {
      testWithTemporaryDirectory(
        'stops responding to style change on focus',
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
          await page.goto(pageUrl);
          await page.waitForLoadState();
          await page.evaluate(libraryJsContent);
          const startViewBox = await page
            .locator('svg')
            .getAttribute('viewBox');

          // Act:
          await page.evaluate(() => {
            const svgElement =
              document.documentElement as unknown as SVGSVGElement;
            const pavpenProCsvg = (
              window as unknown as { pavpenProCsvg: CsvgLibrary }
            ).pavpenProCsvg;

            pavpenProCsvg.CsvgDocument.forSvgElement(
              svgElement,
            ).stopLiveUpdate();
          });

          // Verify:
          await page.getByText('La belle').and(page.locator('text')).focus();
          await expect(
            page.getByText('La belle').and(page.locator('text')),
          ).toBeFocused();
          const endViewBox = await page.locator('svg').getAttribute('viewBox');

          try {
            expect(startViewBox).toEqual('-90 -51 180 65');
            expect(endViewBox).toEqual('-90 -51 180 65');
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
  });
});
