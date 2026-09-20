import type { DocumentEvaluationInformation } from './document-evaluation-information';
import type { ElementDepedencyCalculator } from './element-dependency-calculator';
import {
  CircularAttributeSettingExpressionError,
  CircularConstantDefinitionError,
  InternalInterpreterError,
  InvalidAttributeExpressionError,
  InvalidExpressionError,
  UndefinedConstantError,
} from './faults';
import type { JinjaEvaluationScope, JinjaEvaluator } from './jinja-evaluator';
import { csvg_namespace } from './xml-names';
import { calculateAttrXPath, calculateElementXPath } from './xpath-helpers';

// TODO(pavel.penev): Implement `getBBox` options with poly-fills.
/**
 * See
 * <https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getBBox#options>.
 */
export interface GetBBoxOptions {
  fill?: boolean;
  stroke?: boolean;
  markers?: boolean;
  clipped?: boolean;
}

export interface BBoxForEvaluation {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CsvgElement {
  readonly getBBox?: () => BBoxForEvaluation | undefined;
  readonly getBoundingClientRect?: () => BBoxForEvaluation | undefined;
  readonly getAttribute: (qualifiedName: string) => string | null;
}

export interface CsvgDocument {
  readonly getElementById: (id: string) => CsvgElement | null;
}

export interface CsvgForEvaluation {
  readonly consts: Record<string, unknown>;
  readonly getElementByDocLocalId: (docLocalId: string) => CsvgElement | null;
}

export const toDomRectForEvaluation = (domRect: DOMRect): BBoxForEvaluation =>
  Object.freeze({
    x: domRect.x,
    y: domRect.y,
    width: domRect.width,
    height: domRect.height,
  });

const parseCssFloatProprty: (propertyValue: string) => number | string = (
  propertyValue,
) => {
  const result = parseFloat(propertyValue);

  return Number.isNaN(result) ? propertyValue : result;
};

export const toUsedStyleDimensionsForEvaluation = (style: CSSStyleProperties) =>
  Object.freeze({
    leftPx: parseCssFloatProprty(style.left),
    rightPx: parseCssFloatProprty(style.right),
    topPx: parseCssFloatProprty(style.top),
    bottomPx: parseCssFloatProprty(style.bottom),
    widthPx: parseCssFloatProprty(style.width),
    heightPx: parseCssFloatProprty(style.height),
    marginLeftPx: parseCssFloatProprty(style.marginLeft),
    marginRightPx: parseCssFloatProprty(style.marginRight),
    marginTopPx: parseCssFloatProprty(style.marginTop),
    marginBottomPx: parseCssFloatProprty(style.marginBottom),
    paddingLeftPx: parseCssFloatProprty(style.paddingLeft),
    paddingRightPx: parseCssFloatProprty(style.paddingRight),
    paddingTopPx: parseCssFloatProprty(style.paddingTop),
    paddingBottomPx: parseCssFloatProprty(style.paddingBottom),
    textIndentPx: parseCssFloatProprty(style.textIndent),
    fontSizePx: parseCssFloatProprty(style.fontSize),
    strokeWidthPx: parseCssFloatProprty(style.strokeWidth),
  });

/**
 * Replaces expressions like
 * `{{ document.getElementById('label').getBBox().width }}` with their
 * evaluation results in a given expression string
 *
 * @param expression to evaluate
 */
export const evaluateJinjaTemplateString = (
  expression: string,
  options: {
    expressionSource: Attr;
    globalScope: JinjaEvaluationScope;
    jinjaEvaluator: JinjaEvaluator;
  },
): string => {
  const { expressionSource, globalScope, jinjaEvaluator } = options;
  console.debug(`Evaluating Jinja template: ${JSON.stringify(expression)}`);

  let result: string;
  try {
    result = jinjaEvaluator.expandString(expression, globalScope);
  } catch (e) {
    if (e instanceof InternalInterpreterError) {
      e.add_note(
        `While evaluating Jinja template string: ${JSON.stringify(expression)}`,
      );
      e.add_note(
        `Expression definition attribute: ${calculateAttrXPath(expressionSource)}`,
      );
      throw e;
    }
    throw new InvalidAttributeExpressionError({
      expressionString: expression,
      expressionDefinitionAttribute: expressionSource,
      cause: e as Error,
    });
  }

  return result;
};

/**
 * Returns the value of a Jinja expression like
 * `document.getElementById('label').getBBox().width`
 *
 * @param expression to evaluate
 */
export const evaluateJinjaExpressionString = (
  expression: string,
  options: {
    expressionSource: Attr;
    globalScope: JinjaEvaluationScope;
    jinjaEvaluator: JinjaEvaluator;
  },
): unknown => {
  const { expressionSource, globalScope, jinjaEvaluator } = options;
  console.debug(`Evaluating Jinja expression: ${JSON.stringify(expression)}`);

  let result: unknown;
  try {
    result = jinjaEvaluator.eval(expression, globalScope);
  } catch (e) {
    if (e instanceof InternalInterpreterError) {
      e.add_note(
        `While evaluating Jinja expression string: ${JSON.stringify(expression)}`,
      );
      e.add_note(
        `Expression definition attribute: ${calculateAttrXPath(expressionSource)}`,
      );
      throw e;
    }
    throw new InvalidAttributeExpressionError({
      expressionString: expression,
      expressionDefinitionAttribute: expressionSource,
      cause: e as Error,
    });
  }

  return result;
};

export class PartialEvaluationState {
  readonly documentEvaluationInformation: DocumentEvaluationInformation;
  readonly elementDependencyCalculator: ElementDepedencyCalculator;
  readonly disallowedDependencyAttributes: Set<Attr> = new Set();
  readonly renderedAttributes: Set<Attr> = new Set();

  /**
   * Attributes that are disregarded as dependencies when evaluating
   * subsequent expressions
   *
   * E.g., used to avoid circular dependencies when an element's 'dx'
   * attribute depends on the element's `getBBox().height`.  Calculating the
   * bounding box requires rendering the element, but the element's 'dx'
   * doesn't affect the bounding box height, so it can be skipped when
   * evaluating `getBBox().height`.
   */
  readonly attributesToSkip: Set<Attr> = new Set();

  readonly renderedElements: Set<Element> = new Set();
  readonly jinjaEvaluator: JinjaEvaluator;
  readonly csvgConstNameToValue: Map<string, unknown> = new Map();
  readonly disallowedConstantNames: Set<string> = new Set();

  constructor({
    documentEvaluationInformation,
    jinjaEvaluator,
  }: {
    documentEvaluationInformation: DocumentEvaluationInformation;
    jinjaEvaluator: JinjaEvaluator;
  }) {
    this.documentEvaluationInformation = documentEvaluationInformation;
    this.elementDependencyCalculator =
      documentEvaluationInformation.getElementDependencyCalculator();
    this.jinjaEvaluator = jinjaEvaluator;
  }
}

export class EvaluationState extends PartialEvaluationState {
  globalScope: JinjaEvaluationScope;

  constructor({
    globalScope,
    ...rest
  }: {
    documentEvaluationInformation: DocumentEvaluationInformation;
    globalScope: JinjaEvaluationScope;
    jinjaEvaluator: JinjaEvaluator;
  }) {
    super(rest);
    this.globalScope = globalScope;
  }

  renderAttributeExpression(expressionSource: Attr): void {
    const {
      disallowedDependencyAttributes,
      renderedAttributes,
      globalScope,
      jinjaEvaluator,
    } = this;
    const expressionString = expressionSource.value;
    if (expressionString === null) {
      console.debug(
        `Rendering attribute ${calculateAttrXPath(expressionSource)}: \
  Skipping null attribute value!`,
      );

      return;
    }

    if (renderedAttributes.has(expressionSource)) {
      console.debug(
        `Skipping already-rendered attribute ${calculateAttrXPath(expressionSource)}.`,
      );

      return;
    }

    if (disallowedDependencyAttributes.has(expressionSource)) {
      throw new CircularAttributeSettingExpressionError({
        expressionString,
        expressionDefinitionAttribute: expressionSource,
        dependencyChain: Array.from(disallowedDependencyAttributes.values()),
      });
    }
    disallowedDependencyAttributes.add(expressionSource);

    console.debug(
      `Rendering attribute ${calculateAttrXPath(expressionSource)}.`,
    );

    const expressionValue = evaluateJinjaTemplateString(expressionString, {
      expressionSource,
      globalScope,
      jinjaEvaluator,
    });

    disallowedDependencyAttributes.delete(expressionSource);

    const ownerElement = expressionSource.ownerElement;
    if (ownerElement === null) {
      throw new InternalInterpreterError(
        `Can't render an attribute expression for attribute that's not part of \
an element!  Attribute name: ${expressionSource.name}, \
expression: ${JSON.stringify(expressionString)}`,
      );
    }

    console.debug(
      `Setting ${calculateElementXPath(ownerElement)}/@${expressionSource.localName} to ${JSON.stringify(expressionValue)}`,
    );

    // Avoid triggering `MutationObserver` updates:
    if (
      ownerElement.getAttribute(expressionSource.localName) !== expressionValue
    ) {
      ownerElement.setAttribute(expressionSource.localName, expressionValue);
    }

    renderedAttributes.add(expressionSource);
  }

  /**
   * Evaluates, and substitutes all expressions that affect a given element's
   * bounding box, or clientRect
   */
  renderElement(element: Element): void {
    const {
      documentEvaluationInformation,
      elementDependencyCalculator,
      renderedElements,
    } = this;

    if (renderedElements.has(element)) {
      console.debug(
        `Skipping rendering of already rendered element: ${calculateElementXPath(element)}.`,
      );

      return;
    }

    console.debug(`Rendering element: ${calculateElementXPath(element)}.`);

    let referencedElement =
      documentEvaluationInformation.getReferencedElement(element);

    if (typeof referencedElement === 'undefined') {
      referencedElement =
        elementDependencyCalculator.insertElementReference(element);
    }

    // Render descendents, which may affect this element:
    for (const nearestDescendent of referencedElement.closestDescendents.values()) {
      this.renderElement(nearestDescendent.element);
    }

    // Render attribute expressions:
    for (const attribute of referencedElement.jinjaExpressionAttributes) {
      this.renderAttributeExpression(attribute);
    }

    renderedElements.add(element);
  }

  renderCsvgConst(constName: string): unknown {
    if (this.csvgConstNameToValue.has(constName)) {
      console.debug(
        `Returning already-calculated constant value ${JSON.stringify(constName)}.`,
      );

      return this.csvgConstNameToValue.get(constName);
    }

    console.debug(`Evaluating constant ${JSON.stringify(constName)}`);

    const expressionAttribute =
      this.documentEvaluationInformation.getConstExpressionAttr(constName);

    if (typeof expressionAttribute === 'undefined') {
      throw new UndefinedConstantError({ constName });
    }

    if (this.disallowedConstantNames.has(constName)) {
      throw new CircularConstantDefinitionError({
        constName,
        dependencyChain: Array.from(this.disallowedConstantNames),
      });
    }
    this.disallowedConstantNames.add(constName);

    let expressionValue: unknown;
    try {
      expressionValue = evaluateJinjaExpressionString(
        expressionAttribute.value,
        {
          expressionSource: expressionAttribute,
          globalScope: this.globalScope,
          jinjaEvaluator: this.jinjaEvaluator,
        },
      );
    } catch (e) {
      if (e instanceof InvalidExpressionError) {
        e.add_note(`While evaluating constant ${JSON.stringify(constName)}`);
      }
      throw e;
    }

    console.debug(
      `Constant ${JSON.stringify(constName)} = ${JSON.stringify(expressionValue)}.`,
    );

    this.csvgConstNameToValue.set(constName, expressionValue);

    this.disallowedConstantNames.delete(constName);

    return expressionValue;
  }
}

export const createJinjaGlobalScope = (
  partialEvaluationState: PartialEvaluationState,
) => {
  const { documentEvaluationInformation, jinjaEvaluator } =
    partialEvaluationState;
  const evaluationState = new EvaluationState({
    ...partialEvaluationState,
  } as EvaluationState);

  const toElementForEvaluation: (element: Element) => CsvgElement = (
    element,
  ) => {
    const result: {
      getBBox?: () => BBoxForEvaluation | undefined;
      getBoundingClientRect?: () => BBoxForEvaluation | undefined;
      getAttribute: (qualifiedName: string) => string | null;
    } = {
      getAttribute: (qualifiedName: string) => {
        if (!qualifiedName.includes(':')) {
          const expressionAttribute = element.attributes.getNamedItemNS(
            csvg_namespace.attributeExpression.jinja,
            qualifiedName,
          );
          if (expressionAttribute !== null) {
            evaluationState.renderAttributeExpression(expressionAttribute);
          }
        }
        return element.getAttribute(qualifiedName);
      },
    };

    if (element instanceof SVGGraphicsElement) {
      result.getBBox = () => {
        evaluationState.renderElement(element);
        return toDomRectForEvaluation(element.getBBox());
      };
    }
    if (element instanceof SVGElement) {
      result.getBoundingClientRect = () => {
        evaluationState.renderElement(element);
        return toDomRectForEvaluation(element.getBoundingClientRect());
      };
    }

    return Object.freeze(result);
  };

  /**
   * The global `document` variable value when evaluating expressions
   *
   * We don't pass the browser `document` object, since we want to allow only
   * limited operations from user expressions.  E.g., we don't want a user
   * expression to add, or remove elements from the DOM.
   */
  const documentForEvaluation: CsvgDocument = Object.freeze({
    getElementById: (elementId: string) => {
      const element = document.getElementById(elementId);

      if (!element) {
        return element;
      }

      return toElementForEvaluation(element);
    },
  });

  const csvg = {
    getConst: (constName: string) => evaluationState.renderCsvgConst(constName),
    getElementByDocLocalId: (docLocalId: string) => {
      const element =
        documentEvaluationInformation.getElementByDocLocalId(docLocalId);

      if (!element) {
        return null;
      }

      return toElementForEvaluation(element);
    },
    getUsedStyleDimensionsForId: (
      docLocalId: string,
      pseudoElementName: string | null = null,
    ) => {
      const element =
        documentEvaluationInformation.getElementByDocLocalId(docLocalId);

      if (!element) {
        throw new InvalidExpressionError(
          `Element with CSVG 'doc-local-id' ${JSON.stringify(docLocalId)} not found!`,
        );
      }

      return toUsedStyleDimensionsForEvaluation(
        window.getComputedStyle(element, pseudoElementName),
      );
    },
  };

  const globalScope = jinjaEvaluator.createGlobalScope({
    Math: {
      abs: Math.abs,
      min: Math.min,
      max: Math.max,
      round: Math.round,
      sqrt: Math.sqrt,
    },
    NaN: NaN,
    csvg,
    document: documentForEvaluation,
    parseFloat: parseFloat,
    true: true,
    false: false,
    null: null,
  });
  evaluationState.globalScope = globalScope;

  return globalScope;
};
