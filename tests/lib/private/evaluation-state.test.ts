// @rstest-environment jsdom
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from '@rstest/core';
import { CsvgDocument } from '../../../src/lib/api/csvg-document';
import { DocumentEvaluationInformation } from '../../../src/lib/api/internal/document-evaluation-information';
import { EvaluationState } from '../../../src/lib/private/evaluation-state';
import { JinjaEvaluator } from '../../../src/lib/private/jinja-evaluator';
import { happyDomCreateSvgDocumentElement } from '../../../src/private/testing/create-svg-document/happy-dom-create-svg-document-element';

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));

describe(`${CsvgDocument.name}`, async () => {
  test('renderConst creates a reverse dependency on a const', async () => {
    // Setup:
    const outerHTML = (
      await fs.readFile(
        path.join(
          SELF_DIR,
          '../../browser/lib/private/renderConst_creates_a_reverse_dependency_on_a_const.svg',
        ),
      )
    ).toString();

    const svgElement = happyDomCreateSvgDocumentElement(outerHTML);

    const evaluationInformation = new DocumentEvaluationInformation();
    evaluationInformation.calculateForSvgElement(
      svgElement as unknown as SVGSVGElement,
    );
    const evaluationState = new EvaluationState({
      documentEvaluationInformation: evaluationInformation,
      jinjaEvaluator: new JinjaEvaluator(),
    });
    const startReverseDependencies =
      evaluationState.reverseDependencies.toWebBuiltIns();

    // Act:
    const constResult = evaluationState.renderConst('dependent');

    // Verify:
    expect(startReverseDependencies).toEqual({
      attributeToReverseDependencies: new Map(),
      constNameToReverseDependencies: {},
      elementToReverseDependencies: new Map(),
    });
    expect(constResult).toEqual(144);

    expect(evaluationState.reverseDependencies.toWebBuiltIns()).toEqual({
      attributeToReverseDependencies: new Map(),
      constNameToReverseDependencies: {
        leaf: {
          lastExpressionString: '12',
          reverseDependencies: {
            constantNames: new Set(['dependent']),
            expressionAttrs: new Set(),
          },
        },
      },
      elementToReverseDependencies: new Map(),
    });
  });

  test('renderConst of a cached const creates a reverse dependency on a const', async () => {
    // Setup:
    const outerHTML = `
<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
    xmlns:attr-expr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
>
    <title>Unit test sample that has a dependency between constants</title>
    <csvg:consts>
        <csvg:const csvg:name="leaf">12</csvg:const>
        <csvg:const csvg:name="dependent">
            document.getConst('leaf') * document.getConst('leaf')
        </csvg:const>
    </csvg:consts>
</svg>
`.trim();

    const svgElement = happyDomCreateSvgDocumentElement(outerHTML);

    const evaluationInformation = new DocumentEvaluationInformation();
    evaluationInformation.calculateForSvgElement(
      svgElement as unknown as SVGSVGElement,
    );
    const evaluationState = new EvaluationState({
      documentEvaluationInformation: evaluationInformation,
      jinjaEvaluator: new JinjaEvaluator(),
    });
    const startReverseDependencies =
      evaluationState.reverseDependencies.toWebBuiltIns();
    // Render leaf constant without any reverse dependencies first:
    const leafConstResult = evaluationState.renderConst('leaf');

    // Act:
    // Evaluate depending on an already-rendered const:
    const constResult = evaluationState.renderConst('dependent');

    // Verify:
    expect(startReverseDependencies).toEqual({
      attributeToReverseDependencies: new Map(),
      constNameToReverseDependencies: {},
      elementToReverseDependencies: new Map(),
    });
    expect(leafConstResult).toEqual(12);
    expect(constResult).toEqual(144);

    expect(evaluationState.reverseDependencies.toWebBuiltIns()).toEqual({
      attributeToReverseDependencies: new Map(),
      constNameToReverseDependencies: {
        leaf: {
          lastExpressionString: '12',
          reverseDependencies: {
            constantNames: new Set(['dependent']),
            expressionAttrs: new Set(),
          },
        },
      },
      elementToReverseDependencies: new Map(),
    });
  });
});
