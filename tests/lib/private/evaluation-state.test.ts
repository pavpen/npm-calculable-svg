// @rstest-environment happy-dom
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from '@rstest/core';
import { CsvgDocument } from '../../../src/lib/api/csvg-document';
import { ExpressionLanguage } from '../../../src/lib/api/internal/calculation-expression';
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
      attributeCalculationToReverseDependencies: [],
      constNameToReverseDependencies: {},
      elementToReverseDependencies: new Map(),
    });
    expect(constResult).toEqual(144);

    expect(evaluationState.reverseDependencies.toWebBuiltIns()).toEqual({
      attributeCalculationToReverseDependencies: [],
      constNameToReverseDependencies: {
        leaf: {
          lastExpressionString: '12',
          reverseDependencies: {
            constantNames: new Set(['dependent']),
            expressionAttrs: [],
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
      attributeCalculationToReverseDependencies: [],
      constNameToReverseDependencies: {},
      elementToReverseDependencies: new Map(),
    });
    expect(leafConstResult).toEqual(12);
    expect(constResult).toEqual(144);

    expect(evaluationState.reverseDependencies.toWebBuiltIns()).toEqual({
      attributeCalculationToReverseDependencies: [],
      constNameToReverseDependencies: {
        leaf: {
          lastExpressionString: '12',
          reverseDependencies: {
            constantNames: new Set(['dependent']),
            expressionAttrs: [],
          },
        },
      },
      elementToReverseDependencies: new Map(),
    });
  });

  test('getAttribute creates a reverse dependency on an attribute calculation', async () => {
    // Setup:
    const outerHTML = `\
<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
    xmlns:attr-expr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
>
    <title>Unit test sample that has a dependency between constants</title>
    <g>
      <rect csvg:doc-local-id="source" attr-expr:width="{{ 100 }}" height="100"/>
      <rect csvg:doc-local-id="destination" attr-expr:width="{{ document.localIdToElement.get('source').getAttribute('width') }}2" height="101"/>
    </g>
</svg>
`;

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
    const sourceElement =
      evaluationInformation.getElementByDocLocalId('source');
    if (!sourceElement) {
      throw new Error('Test element not found!');
    }
    const destinationElement =
      evaluationInformation.getElementByDocLocalId('destination');
    if (!destinationElement) {
      throw new Error('Test element not found!');
    }
    const destinationReferencedElement =
      evaluationInformation.getReferencedElement(destinationElement);
    if (!destinationReferencedElement) {
      throw new Error('Expected ReferencedElement not found for test element!');
    }
    const attrCalculation =
      destinationReferencedElement.getOutputAttributeCalculationNS(
        'http://www.w3.org/2000/svg',
        'width',
      );
    if (!attrCalculation) {
      throw new Error(
        'Expected test attribute calculation definition not found!',
      );
    }

    // Act:
    evaluationState.renderCalculatedAttribute(attrCalculation);

    // Verify:
    expect(startReverseDependencies).toEqual({
      attributeCalculationToReverseDependencies: [],
      constNameToReverseDependencies: {},
      elementToReverseDependencies: new Map(),
    });

    expect(evaluationState.reverseDependencies.toWebBuiltIns()).toEqual({
      attributeCalculationToReverseDependencies: [
        [
          {
            sourceAttr: destinationElement.getAttributeNode('attr-expr:width'),
            sourceCode:
              "{{ document.localIdToElement.get('source').getAttribute('width') }}2",
            languageName: ExpressionLanguage.getNameForValue(
              ExpressionLanguage.Jinja,
            ),
            nameAttr: null,
          },
          {
            lastExpressionString:
              "{{ document.localIdToElement.get('source').getAttribute('width') }}2",
            reverseDependencies: {
              expressionAttrs: {
                sourceAttr: sourceElement.getAttributeNode('attr-expr:width'),
                sourceCode: '{{ 100 }}',
                languageName: ExpressionLanguage.getNameForValue(
                  ExpressionLanguage.Jinja,
                ),
                nameAttr: null,
              },
              constantNames: new Set(),
            },
          },
        ],
      ],
      constNameToReverseDependencies: {},
      elementToReverseDependencies: new Map(),
    });
  });
});
