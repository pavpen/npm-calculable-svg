import type { AttributeDependencies } from './attribute-dependencies';
import type { DocumentEvaluationInformation } from './document-evaluation-information';
import type { ReferencedElement } from './element-dependencies';
import type { ElementDepedencyCalculator } from './element-dependency-calculator';
import {
  type BBoxForEvaluation,
  type CsvgDocument,
  type CsvgElement,
  evaluateJinjaTemplateString,
  toDomRectForEvaluation,
} from './evaluation-helpers';
import { AttributeNotFoundError } from './faults';
import {
  GetElementPropertyExpression,
  type NonIterableElementPropertyExpressionSet,
} from './get-element-property-expresion';
import type { JinjaEvaluator } from './jinja-evaluator';
import { csvg_namespace } from './xml-names';
import { calculateAttrXPath } from './xpath-helpers';

export class AttributeDependencyCalculator {
  private readonly outputDependencies: AttributeDependencies;
  private readonly outputElementDependencyCalculator: ElementDepedencyCalculator;
  private readonly documentEvaluationInformation: DocumentEvaluationInformation;
  private readonly jinjaEvaluator: JinjaEvaluator;

  constructor({
    outputDependencies,
    outputElementDependencyCalculator,
    documentEvaluationInformation,
    jinjaEvaluator,
  }: {
    outputDependencies: AttributeDependencies;
    outputElementDependencyCalculator: ElementDepedencyCalculator;
    documentEvaluationInformation: DocumentEvaluationInformation;
    jinjaEvaluator: JinjaEvaluator;
  }) {
    this.outputDependencies = outputDependencies;
    this.outputElementDependencyCalculator = outputElementDependencyCalculator;
    this.documentEvaluationInformation = documentEvaluationInformation;
    this.jinjaEvaluator = jinjaEvaluator;
  }

  private processElementTree(referencedElement: ReferencedElement): void {
    for (const attribute of referencedElement.jinjaExpressionAttributes) {
      const dependencies =
        this.outputDependencies.getOrCreateElementPropertyExpressionsForAttribute(
          attribute,
        );
      const result = evaluateJinjaTemplateString(attribute.value, {
        expressionSource: attribute,
        globalScope: createDependencyBuildingEnvironment({
          outputExpressionDependencies: dependencies,
          outputElementDependencyCalculator:
            this.outputElementDependencyCalculator,
          documentEvaluationInformation: this.documentEvaluationInformation,
          jinjaEvaluator: this.jinjaEvaluator,
        }),
        jinjaEvaluator: this.jinjaEvaluator,
      });

      console.debug(
        `Evaluated ${calculateAttrXPath(attribute)} to ${JSON.stringify(result)}`,
      );
    }
    for (const element of referencedElement.closestDescendents) {
      this.processElementTree(element);
    }
  }

  calculate(): void {
    for (const element of this.documentEvaluationInformation.getRootReferencedElements()) {
      this.processElementTree(element);
    }
  }
}

const toBBoxForDependencyEvaluation = ({
  element,
  bbox,
  outputExpressionDependencies,
}: {
  element: SVGGraphicsElement;
  bbox: DOMRect;
  outputExpressionDependencies: NonIterableElementPropertyExpressionSet;
}) => ({
  get x(): number {
    outputExpressionDependencies.add(
      GetElementPropertyExpression.forGetBBoxProperty({
        element: element,
        propertyName: 'x',
      }),
    );

    return bbox.x;
  },

  get y(): number {
    outputExpressionDependencies.add(
      GetElementPropertyExpression.forGetBBoxProperty({
        element: element,
        propertyName: 'y',
      }),
    );

    return bbox.y;
  },

  get width(): number {
    outputExpressionDependencies.add(
      GetElementPropertyExpression.forGetBBoxProperty({
        element: element,
        propertyName: 'width',
      }),
    );

    return bbox.width;
  },

  get height(): number {
    outputExpressionDependencies.add(
      GetElementPropertyExpression.forGetBBoxProperty({
        element: element,
        propertyName: 'height',
      }),
    );

    return bbox.height;
  },
});

/**
 * Returns a `jinja.Environment`, such that evaulating an expression in this
 * environment detects, and stores the element properties the exrpession
 * depends on
 *
 * The expression's dependencies are added to the passed in
 * `outputDependencies`.
 */
const createDependencyBuildingEnvironment = ({
  outputExpressionDependencies,
  outputElementDependencyCalculator,
  documentEvaluationInformation,
  jinjaEvaluator,
}: {
  outputExpressionDependencies: NonIterableElementPropertyExpressionSet;
  outputElementDependencyCalculator: ElementDepedencyCalculator;
  documentEvaluationInformation: DocumentEvaluationInformation;
  jinjaEvaluator: JinjaEvaluator;
}) => {
  const toElementForEvaluation: (element: Element) => CsvgElement = (
    element,
  ) => {
    const result: {
      getBBox?: () => BBoxForEvaluation | undefined;
      getBoundingClientRect?: () => BBoxForEvaluation | undefined;
      getAttribute: (qualifiedName: string) => string | null;
    } = {
      getAttribute: (qualifiedName: string) => {
        // Check if this attribute may be set by an attribute expression:
        if (
          !qualifiedName.includes(':') &&
          element.hasAttributeNS(
            csvg_namespace.attributeExpression.jinja,
            qualifiedName,
          )
        ) {
          outputExpressionDependencies.add(
            GetElementPropertyExpression.forGetAttribute({
              element,
              qualifiedName,
            }),
          );
          if (element.hasAttribute(qualifiedName)) {
            return element.getAttribute(qualifiedName);
          }
          // Return a temporary value, just for calculating dependencies:
          return '';
        }
        if (!element.hasAttribute(qualifiedName)) {
          throw new AttributeNotFoundError({
            element,
            attributeQualifiedName: qualifiedName,
          });
        }
        return element.getAttribute(qualifiedName);
      },
    };

    if (element instanceof SVGGraphicsElement) {
      result.getBBox = () => {
        outputElementDependencyCalculator.insertElementReference(element);
        return toBBoxForDependencyEvaluation({
          element,
          bbox: element.getBBox(),
          outputExpressionDependencies,
        });
      };
    }
    if (element instanceof SVGElement) {
      result.getBoundingClientRect = () => {
        outputExpressionDependencies.add(
          GetElementPropertyExpression.forGetBoundingClientRect({ element }),
        );
        outputElementDependencyCalculator.insertElementReference(element);
        return toDomRectForEvaluation(element.getBoundingClientRect());
      };
    }

    return Object.freeze(result);
  };
  /**
   * The global `document` variable value when evaluating expressions
   */
  const documentForEvaluation: CsvgDocument = Object.freeze({
    getElementById: (elementId: string) => {
      const element = document.getElementById(elementId);

      if (!element) {
        return element;
      }
      return toElementForEvaluation(element);
    },
    csvg: Object.freeze({
      getElementByDocLocalId: (docLocalId: string) => {
        const element =
          documentEvaluationInformation.getElementByDocLocalId(docLocalId);

        if (!element) {
          return null;
        }
        return toElementForEvaluation(element);
      },
    }),
  });

  return jinjaEvaluator.createGlobalScope({
    Math: {
      min: Math.min,
      max: Math.max,
      sqrt: Math.sqrt,
    },
    document: documentForEvaluation,
    parseFloat: parseFloat,
  });
};
