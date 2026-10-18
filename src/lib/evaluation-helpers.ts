import {
  ComparableCsvgDomRect as ComparableCsvgDomRect,
  CsvgDomRect,
} from './api/csvg-dom-rect';
import {
  ComparableCsvgUsedStyleDimensions,
  CsvgUsedStyleDimensions,
} from './api/csvg-used-style-dimensions';
import type { DocumentEvaluationInformation } from './document-evaluation-information';
import {
  ElementReverseDependencies,
  UsedStyleDimensionsReverseDependencies,
} from './reverse-dependencies/element-reverse-dependencies';
import { ExpressionReverseDependencies } from './reverse-dependencies/expression-reverse-dependencies';
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
import { DocumentReverseDependencies } from './reverse-dependencies/document-reverse-dependencies';
import { InvalidatedCalculables } from './reverse-dependencies/invalidated-calculables';

export interface CsvgElement {
  readonly getBBox?: () => CsvgDomRect | undefined;
  readonly getBoundingClientRect?: () => CsvgDomRect | undefined;
  readonly getAttribute: (qualifiedName: string) => string | null;
}

export interface CsvgDocument {
  readonly getElementById: (id: string) => CsvgElement | null;
}

export interface CsvgForEvaluation {
  readonly consts: Record<string, unknown>;
  readonly getElementByDocLocalId: (docLocalId: string) => CsvgElement | null;
}

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

  console.debug('Evaluated Jinja template.', {
    expression,
    value: result,
  });

  return result;
};

/**
 * Returns the value of a Jinja expression like
 * `document.getElementById('label').getBBox().width`
 *
 * @param expression to evaluate
 */
const evaluateJinjaExpressionString = (
  expression: string,
  options: {
    expressionSource: Attr;
    globalScope: JinjaEvaluationScope;
    jinjaEvaluator: JinjaEvaluator;
  },
): unknown => {
  const { expressionSource, globalScope, jinjaEvaluator } = options;

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

  console.debug('Evaluated Jinja expression.', {
    expression,
    value: result,
  });

  return result;
};

export class EvaluationState {
  readonly documentEvaluationInformation: DocumentEvaluationInformation;
  readonly jinjaGlobalScope: JinjaEvaluationScope;
  readonly jinjaEvaluator: JinjaEvaluator;
  readonly reverseDependencies: DocumentReverseDependencies;

  /**
   * Expression attributes that are disallowed in subsequent expressions
   *
   * This is used to detect circular dependencies.  During the evaluation of
   * an expression attribute, subsequent expressions are disallowed from
   * requesting the value of this attribute.
   */
  readonly disallowedExpressionAttributes: Set<Attr> = new Set();

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

  /**
   * Cached values for already rendered constants
   */
  readonly constNameToValue: Map<string, unknown> = new Map();

  /**
   * Names of constants that are disallowed in subsequent expressions
   *
   * This is used to detect circular dependencies.  During the calculation of
   * a constant subsequent expressions are disallowed from requesting the
   * calculation of this constant.
   */
  readonly disallowedConstNames: Set<string> = new Set();

  /**
   * The stack of expressions currently being evaluated
   *
   * Each element is either:
   * * A constant name (string), on
   * * An expression `Attr`
   */
  protected readonly expressionsUnderEvaluation: Array<string | Attr> = [];

  constructor({
    documentEvaluationInformation,
    jinjaEvaluator,
  }: {
    documentEvaluationInformation: DocumentEvaluationInformation;
    jinjaEvaluator: JinjaEvaluator;
  }) {
    this.documentEvaluationInformation = documentEvaluationInformation;
    this.jinjaEvaluator = jinjaEvaluator;
    this.jinjaGlobalScope = this.createJinjaGlobalScope();
    this.reverseDependencies = new DocumentReverseDependencies({
      documentReferencedElements:
        documentEvaluationInformation.documentReferencedElements,
    });
  }

  private getCurrentExpressionUnderEvaluationOrThrow(): string | Attr {
    const elementCount = this.expressionsUnderEvaluation.length;

    if (elementCount < 1) {
      throw new InternalInterpreterError(
        `The 'expressionsUnderEvaluation' is empty when we must be \
evaluating an expression!`,
      );
    }
    const result = this.expressionsUnderEvaluation[elementCount - 1];

    return result;
  }

  private addCurrentExpressionDependencyOnBBox(
    element: Element,
    lastBBox: ComparableCsvgDomRect,
  ): void {
    let slot =
      this.reverseDependencies.elementToReverseDependencies.get(element);
    if (typeof slot === 'undefined') {
      slot = new ElementReverseDependencies();
      slot.lastBBox = lastBBox;
      this.reverseDependencies.elementToReverseDependencies.set(element, slot);
    }

    const expression = this.getCurrentExpressionUnderEvaluationOrThrow();

    switch (typeof expression) {
      case 'string':
        slot.bboxReverseDependencies.addConstant(expression);
        break;
      case 'object':
        slot.bboxReverseDependencies.addExpresionAttr(expression);
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${expression}`,
        );
    }
  }

  private addCurrentExpressionDependencyOnBoundingClientRect(
    element: Element,
    lastBoundingClientRect: ComparableCsvgDomRect,
  ): void {
    let slot =
      this.reverseDependencies.elementToReverseDependencies.get(element);
    if (typeof slot === 'undefined') {
      slot = new ElementReverseDependencies();
      slot.lastBoundingClientRect = lastBoundingClientRect;
      this.reverseDependencies.elementToReverseDependencies.set(element, slot);
    }

    const expression = this.getCurrentExpressionUnderEvaluationOrThrow();

    switch (typeof expression) {
      case 'string':
        slot.boundingClientRectReverseDependencies.addConstant(expression);
        break;
      case 'object':
        slot.boundingClientRectReverseDependencies.addExpresionAttr(expression);
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${expression}`,
        );
    }
  }

  private addCurrentExpressionDependencyOnUsedStyleDimensions(
    element: Element,
    pseudoElementName: string,
    lastUsedStyleDimensions: ComparableCsvgUsedStyleDimensions,
  ): void {
    let elementSlot =
      this.reverseDependencies.elementToReverseDependencies.get(element);
    if (typeof elementSlot === 'undefined') {
      elementSlot = new ElementReverseDependencies();
      this.reverseDependencies.elementToReverseDependencies.set(
        element,
        elementSlot,
      );
    }

    let pseudoElementSlot =
      elementSlot.pseudoElementNameToUsedStyleDimensionDependencies.get(
        pseudoElementName,
      );
    if (typeof pseudoElementSlot === 'undefined') {
      pseudoElementSlot = new UsedStyleDimensionsReverseDependencies(
        lastUsedStyleDimensions,
      );
      elementSlot.pseudoElementNameToUsedStyleDimensionDependencies.set(
        pseudoElementName,
        pseudoElementSlot,
      );
    }

    const expression = this.getCurrentExpressionUnderEvaluationOrThrow();

    switch (typeof expression) {
      case 'string':
        pseudoElementSlot.reverseDependencies.addConstant(expression);
        break;
      case 'object':
        pseudoElementSlot.reverseDependencies.addExpresionAttr(expression);
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${expression}`,
        );
    }
  }

  private addLastExpressionDependencyOnConst(
    constName: string,
    expressionString: string,
  ): void {
    let slot =
      this.reverseDependencies.constNameToReverseDependencies.get(constName);

    if (typeof slot === 'undefined') {
      slot = new ExpressionReverseDependencies(expressionString);
      this.reverseDependencies.constNameToReverseDependencies.set(
        constName,
        slot,
      );
    } else {
      if (slot.lastExpressionString !== expressionString) {
        throw new InternalInterpreterError(
          `Expression string for csvgConst changed during \
document evaluation!  Constant name: ${JSON.stringify(constName)} \
previous expresison string: ${JSON.stringify(slot.lastExpressionString)}, \
current expression string: ${JSON.stringify(expressionString)}.`,
        );
      }
    }

    const expression = this.expressionsUnderEvaluation.at(-1);

    switch (typeof expression) {
      case 'string':
        slot.reverseDependencies.addConstant(expression);
        break;
      case 'object':
        slot.reverseDependencies.addExpresionAttr(expression);
        break;
      case 'undefined':
        // A top-level expression call has no reverse dependencies.
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${expression}`,
        );
    }
  }

  private addLastExpressionDependencyOnExpressionAttribute(
    expressionAttribute: Attr,
    expressionString: string,
  ): void {
    let slot =
      this.reverseDependencies.attributeToReverseDependencies.get(
        expressionAttribute,
      );

    if (typeof slot === 'undefined') {
      slot = new ExpressionReverseDependencies(expressionString);
      this.reverseDependencies.attributeToReverseDependencies.set(
        expressionAttribute,
        slot,
      );
    } else {
      if (slot.lastExpressionString !== expressionString) {
        throw new InternalInterpreterError(
          `Expression string for Attribute Expression changed during \
document evaluation!  Attribute: ${calculateAttrXPath(expressionAttribute)} \
previous expresison string: ${JSON.stringify(slot.lastExpressionString)}, \
current expression string: ${JSON.stringify(expressionString)}.`,
        );
      }
    }

    const expression = this.expressionsUnderEvaluation.at(-1);

    switch (typeof expression) {
      case 'string':
        slot.reverseDependencies.addConstant(expression);
        break;
      case 'object':
        slot.reverseDependencies.addExpresionAttr(expression);
        break;
      case 'undefined':
        // A top-level expression call has no reverse dependencies.
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${expression}`,
        );
    }
  }

  private createJinjaGlobalScope(): JinjaEvaluationScope {
    const { documentEvaluationInformation, jinjaEvaluator } = this;
    const evaluationState = this;

    const toElementForEvaluation: (element: Element) => CsvgElement = (
      element,
    ) => {
      const result: {
        getBBox?: () => CsvgDomRect | undefined;
        getBoundingClientRect?: () => CsvgDomRect | undefined;
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
          const result = new ComparableCsvgDomRect(element.getBBox());
          evaluationState.addCurrentExpressionDependencyOnBBox(element, result);
          return result;
        };
      }
      if (element instanceof Element) {
        result.getBoundingClientRect = () => {
          evaluationState.renderElement(element);
          const result = new ComparableCsvgDomRect(
            element.getBoundingClientRect(),
          );
          evaluationState.addCurrentExpressionDependencyOnBoundingClientRect(
            element,
            result,
          );
          return result;
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
      getConst: (constName: string) => evaluationState.renderConst(constName),
      getElementByDocLocalId: (docLocalId: string): CsvgElement | null => {
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
      ): CsvgUsedStyleDimensions => {
        const element =
          documentEvaluationInformation.getElementByDocLocalId(docLocalId);

        if (!element) {
          throw new InvalidExpressionError(
            `Element with CSVG 'doc-local-id' ${JSON.stringify(docLocalId)} not found!`,
          );
        }

        const result = new ComparableCsvgUsedStyleDimensions(
          window.getComputedStyle(element, pseudoElementName),
        );
        evaluationState.addCurrentExpressionDependencyOnUsedStyleDimensions(
          element,
          pseudoElementName ?? '',
          result,
        );
        return result;
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

    return globalScope;
  }

  invalidateAttributeExpression(expressionSource: Attr): void {
    this.renderedAttributes.delete(expressionSource);
    this.reverseDependencies.attributeToReverseDependencies.delete(
      expressionSource,
    );
  }

  renderAttributeExpression(expressionSource: Attr): void {
    const {
      disallowedExpressionAttributes,
      renderedAttributes,
      jinjaGlobalScope,
      jinjaEvaluator,
    } = this;
    const expressionString = expressionSource.value;
    if (expressionString === null) {
      console.debug(
        `Skipping null expression attribute: ${calculateAttrXPath(expressionSource)}`,
      );

      return;
    }

    if (renderedAttributes.has(expressionSource)) {
      console.debug(
        `Skipping already-rendered attribute: ${calculateAttrXPath(expressionSource)}`,
      );

      return;
    }

    if (disallowedExpressionAttributes.has(expressionSource)) {
      throw new CircularAttributeSettingExpressionError({
        expressionString,
        expressionDefinitionAttribute: expressionSource,
        dependencyChain: Array.from(disallowedExpressionAttributes.values()),
      });
    }

    this.addLastExpressionDependencyOnExpressionAttribute(
      expressionSource,
      expressionString,
    );

    disallowedExpressionAttributes.add(expressionSource);
    this.expressionsUnderEvaluation.push(expressionSource);

    const expressionValue = evaluateJinjaTemplateString(expressionString, {
      expressionSource,
      globalScope: jinjaGlobalScope,
      jinjaEvaluator,
    });

    if (this.expressionsUnderEvaluation.pop() !== expressionSource) {
      throw new InternalInterpreterError(
        `Currupt 'expressionsUnderEvaluationStack'!  Calling \
'evaluateJinjaTemplate' resulted in a modified stack!`,
      );
    }
    disallowedExpressionAttributes.delete(expressionSource);

    const ownerElement = expressionSource.ownerElement;
    if (ownerElement === null) {
      throw new InternalInterpreterError(
        `Can't render an attribute expression for attribute that's not part of \
an element!  Attribute name: ${expressionSource.name}, \
expression: ${JSON.stringify(expressionString)}`,
      );
    }

    // Avoid triggering `MutationObserver` updates:
    if (
      ownerElement.getAttribute(expressionSource.localName) !== expressionValue
    ) {
      ownerElement.setAttribute(expressionSource.localName, expressionValue);
    }
    console.debug('Rendered expression attribute.', {
      expressionAttribute: expressionSource,
      value: expressionValue,
      skippingDomUpdateWhichIsNoOp:
        ownerElement.getAttribute(expressionSource.localName) ===
        expressionValue,
      reverseDependencies:
        this.reverseDependencies.attributeToReverseDependencies
          .get(expressionSource)
          ?.toJsValue(),
    });

    renderedAttributes.add(expressionSource);
  }

  invalidateElement(element: Element): void {
    this.renderedElements.delete(element);
  }

  /**
   * Evaluates, and substitutes all expressions that affect a given element's
   * bounding box, or clientRect
   */
  renderElement(element: Element): void {
    const { documentEvaluationInformation, renderedElements } = this;

    if (renderedElements.has(element)) {
      console.debug(
        `Skipping already-rendered element: ${calculateElementXPath(element)}`,
      );

      return;
    }

    let referencedElement =
      documentEvaluationInformation.getReferencedElement(element);

    if (typeof referencedElement === 'undefined') {
      referencedElement =
        documentEvaluationInformation.documentReferencedElements.insertElementReference(
          element,
        );
    }

    // Render descendents, which may affect this element:
    for (const nearestDescendent of referencedElement.closestDescendents.values()) {
      this.renderElement(nearestDescendent.element);
    }

    // Render attribute expressions:
    for (const attribute of referencedElement.jinjaExpressionAttributes) {
      this.renderAttributeExpression(attribute);
    }

    console.debug('Rendered element.', {
      element: element,
      reverseDependencies: this.reverseDependencies.elementToReverseDependencies
        .get(element)
        ?.toJsValue(),
    });

    renderedElements.add(element);
  }

  /**
   * Removes a `csvgConst`'s value from the cache, if present
   */
  invalidateConst(constName: string): void {
    this.constNameToValue.delete(constName);
    this.reverseDependencies.constNameToReverseDependencies.delete(constName);
  }

  renderConst(constName: string): unknown {
    if (this.constNameToValue.has(constName)) {
      const result = this.constNameToValue.get(constName);
      console.debug(
        `Returning already-calculated constant ${JSON.stringify(constName)}=${JSON.stringify(result)}.`,
      );

      return result;
    }

    const expressionAttribute =
      this.documentEvaluationInformation.getConstExpressionAttr(constName);

    if (typeof expressionAttribute === 'undefined') {
      throw new UndefinedConstantError({ constName });
    }

    if (this.disallowedConstNames.has(constName)) {
      throw new CircularConstantDefinitionError({
        constName,
        dependencyChain: Array.from(this.disallowedConstNames),
      });
    }

    const expressionString = expressionAttribute.value;

    this.addLastExpressionDependencyOnConst(constName, expressionString);

    this.disallowedConstNames.add(constName);
    this.expressionsUnderEvaluation.push(constName);

    let expressionValue: unknown;
    try {
      expressionValue = evaluateJinjaExpressionString(expressionString, {
        expressionSource: expressionAttribute,
        globalScope: this.jinjaGlobalScope,
        jinjaEvaluator: this.jinjaEvaluator,
      });
    } catch (e) {
      if (e instanceof InvalidExpressionError) {
        e.add_note(`While evaluating constant ${JSON.stringify(constName)}`);
      }
      throw e;
    }

    console.debug('Rendered constant.', {
      name: constName,
      value: expressionValue,
      reverseDependencies:
        this.reverseDependencies.constNameToReverseDependencies
          .get(constName)
          ?.toJsValue(),
    });

    this.constNameToValue.set(constName, expressionValue);

    if (this.expressionsUnderEvaluation.pop() !== constName) {
      throw new InternalInterpreterError(
        `Currupt 'expressionsUnderEvaluationStack'!  Calling \
'evaluateJinjaExpressionString' resulted in a modified stack!`,
      );
    }
    this.disallowedConstNames.delete(constName);

    return expressionValue;
  }

  invalidateCalculables(calculables: InvalidatedCalculables): void {
    for (const constName of calculables.constantNames) {
      this.invalidateConst(constName);
    }
    for (const attr of calculables.expressionAttrs) {
      this.invalidateAttributeExpression(attr);
    }
    for (const element of calculables.elements) {
      this.invalidateElement(element);
    }
  }

  calculateInvalidatedCalculables(calculables: InvalidatedCalculables): void {
    for (const attr of calculables.expressionAttrs) {
      this.renderAttributeExpression(attr);
    }
  }

  clearCalculationCache(): void {
    this.renderedAttributes.clear();
    this.renderedElements.clear();
    this.constNameToValue.clear();
    this.reverseDependencies.clear();
  }
}
