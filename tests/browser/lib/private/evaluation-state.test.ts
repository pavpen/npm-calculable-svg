// happy-dom doesn't correctly expose an iterable `Element.attributes`, so we
// use a browser for these tests

import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from '@rstest/playwright';
import { CsvgDocument } from '../../../../src/lib/api/csvg-document';
import type { DocumentEvaluationInformation } from '../../../../src/lib/api/internal/document-evaluation-information';
import type { EvaluationState } from '../../../../src/lib/private/evaluation-state';
import type { JinjaEvaluator } from '../../../../src/lib/private/jinja-evaluator';
import {
  consoleExceptionsToString,
  consoleMessagesToString,
} from '../../../../src/private/testing/browser-console-helpers';

const DEBUG_LIBRARY_JS_DIST_PATH = './dist/umd.debug/index-debug.js';
const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg';

type CsvgDebugLibrary = {
  internal: {
    DocumentEvaluationInformation: typeof DocumentEvaluationInformation;
  };
  lib_private: {
    EvaluationState: typeof EvaluationState;
    JinjaEvaluator: typeof JinjaEvaluator;
  };
};

describe(`${CsvgDocument.name}`, async () => {
  const debugLibraryJsContent = (
    await fs.readFile(DEBUG_LIBRARY_JS_DIST_PATH)
  ).toString();

  test('renderConst creates a reverse dependency on a const', async ({
    page,
  }) => {
    // Setup:
    const testSampleUrl = `${fileURLToPath(import.meta.url)}/../renderConst_creates_a_reverse_dependency_on_a_const.svg`;
    try {
      await page.goto(testSampleUrl);
      await page.evaluate(debugLibraryJsContent);

      const { startReverseDependencies, constResult, endReverseDependencies } =
        await page.evaluate(
          () => {
            const svgElement =
              document.documentElement as unknown as SVGSVGElement;
            const pavpenProCsvg = (
              window as unknown as { pavpenProCsvg: CsvgDebugLibrary }
            ).pavpenProCsvg;

            const evaluationInformation =
              new pavpenProCsvg.internal.DocumentEvaluationInformation();
            evaluationInformation.calculateForSvgElement(svgElement);
            const evaluationState =
              new pavpenProCsvg.lib_private.EvaluationState({
                documentEvaluationInformation: evaluationInformation,
                jinjaEvaluator: new pavpenProCsvg.lib_private.JinjaEvaluator(),
              });
            const startReverseDependencies =
              evaluationState.reverseDependencies.toStringifiable();

            // Act:
            const constResult = evaluationState.renderConst('dependent');

            return {
              startReverseDependencies,
              constResult,
              endReverseDependencies:
                evaluationState.reverseDependencies.toStringifiable(),
            };
          },
          { svgNamespaceUri: SVG_NAMESPACE_URI },
        );

      // Verify:
      expect(startReverseDependencies).toEqual({
        attributeToReverseDependencies: {},
        constNameToReverseDependencies: {},
        elementToReverseDependencies: {},
      });
      expect(constResult).toEqual(144);

      expect(endReverseDependencies).toEqual({
        attributeToReverseDependencies: {},
        constNameToReverseDependencies: {
          leaf: {
            lastExpressionString: '12',
            reverseDependencies: {
              constantNames: ['dependent'],
              expressionAttrs: [],
            },
          },
        },
        elementToReverseDependencies: {},
      });
    } catch (e) {
      console.error(
        `Browser console messages:\n`,
        consoleMessagesToString(await page.consoleMessages()),
      );
      console.error(
        `Browser errors:`,
        consoleExceptionsToString(await page.pageErrors()),
      );
      throw e;
    }
  });
});
