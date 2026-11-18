import type { CsvgDomRect } from '../api/csvg-dom-rect';
import type { CsvgUsedStyleDimensions } from '../api/csvg-used-style-dimensions';
import {
  CircularAttributeSettingExpressionError,
  CircularConstantDefinitionError,
  InternalInterpreterError,
  InvalidExpressionError,
  UndefinedConstantError,
} from '../api/faults';
import type { DocumentEvaluationInformation } from '../api/internal/document-evaluation-information';
import type { HashableAttributeCalculationDefinition } from '../api/internal/document-referenced-elements';
import { CsvgGlobalNamespaceForEvaluation } from '../expression-api/impl/csvg-global-namespace-for-evaluation';
import type { JinjaEvaluationState } from './jinja-evaluation-state';
import type { JinjaEvaluationScope, JinjaEvaluator } from './jinja-evaluator';
import { DocumentReverseDependencies } from './reverse-dependencies/document-reverse-dependencies';
import {
  ElementReverseDependencies,
  UsedStyleDimensionsReverseDependencies,
} from './reverse-dependencies/element-reverse-dependencies';
import { ExpressionReverseDependencies } from './reverse-dependencies/expression-reverse-dependencies';
import type { InvalidatedCalculables } from './reverse-dependencies/invalidated-calculables';
import { calculateAttrXPath, calculateElementXPath } from './xpath-helpers';

export class EvaluationState implements JinjaEvaluationState {
  readonly documentEvaluationInformation: DocumentEvaluationInformation;
  readonly jinjaGlobalScope: JinjaEvaluationScope;
  readonly jinjaEvaluator: JinjaEvaluator;
  readonly reverseDependencies: DocumentReverseDependencies;

  /**
   * Expression attribute calculations that are disallowed in subsequent
   * expressions
   *
   * This is used to detect circular dependencies.  During the evaluation of
   * an expression attribute, subsequent expressions are disallowed from
   * requesting the calculation of any of these attribute.  When the
   * evaluation of an attribute expression completes, requesting the
   * calculation of this attribute is allowed again.
   */
  readonly disallowedAttributeCalculations: Set<HashableAttributeCalculationDefinition> =
    new Set();

  readonly calculatedAttributeDefinitions: Set<HashableAttributeCalculationDefinition> =
    new Set();

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
   * * A `HashableAttributeCalculationDefinition`
   */
  protected readonly expressionsUnderEvaluation: Array<
    string | HashableAttributeCalculationDefinition
  > = [];

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

  private getCurrentExpressionUnderEvaluationOrThrow():
    | string
    | HashableAttributeCalculationDefinition {
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

  addCurrentExpressionDependencyOnBBox(
    element: Element,
    lastBBox: CsvgDomRect,
  ): void {
    let slot =
      this.reverseDependencies.elementToReverseDependencies.get(element);
    if (typeof slot === 'undefined') {
      slot = new ElementReverseDependencies();
      this.reverseDependencies.elementToReverseDependencies.set(element, slot);
    }
    slot.lastBBox = lastBBox;

    const dependentExpression =
      this.getCurrentExpressionUnderEvaluationOrThrow();

    switch (typeof dependentExpression) {
      case 'string':
        slot.bboxReverseDependencies.addConstant(dependentExpression);
        break;
      case 'object':
        slot.bboxReverseDependencies.addAttributeCalculation(
          dependentExpression,
        );
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${dependentExpression}`,
        );
    }
  }

  addCurrentExpressionDependencyOnBoundingClientRect(
    element: Element,
    lastBoundingClientRect: CsvgDomRect,
  ): void {
    let slot =
      this.reverseDependencies.elementToReverseDependencies.get(element);
    if (typeof slot === 'undefined') {
      slot = new ElementReverseDependencies();
      this.reverseDependencies.elementToReverseDependencies.set(element, slot);
    }
    slot.lastBoundingClientRect = lastBoundingClientRect;

    const dependentExpression =
      this.getCurrentExpressionUnderEvaluationOrThrow();

    switch (typeof dependentExpression) {
      case 'string':
        slot.boundingClientRectReverseDependencies.addConstant(
          dependentExpression,
        );
        break;
      case 'object':
        slot.boundingClientRectReverseDependencies.addAttributeCalculation(
          dependentExpression,
        );
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${dependentExpression}`,
        );
    }
  }

  addCurrentExpressionDependencyOnUsedStyleDimensions(
    element: Element,
    pseudoElementName: string,
    lastUsedStyleDimensions: CsvgUsedStyleDimensions,
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

    const dependentExpression =
      this.getCurrentExpressionUnderEvaluationOrThrow();

    switch (typeof dependentExpression) {
      case 'string':
        pseudoElementSlot.reverseDependencies.addConstant(dependentExpression);
        break;
      case 'object':
        pseudoElementSlot.reverseDependencies.addAttributeCalculation(
          dependentExpression,
        );
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${dependentExpression}`,
        );
    }
  }

  private addLastExpressionDependencyOnConst(
    constName: string,
    expressionSourceCode: string,
  ): void {
    const dependentExpression = this.expressionsUnderEvaluation.at(-1);

    if (typeof dependentExpression === 'undefined') {
      // A top-level expression call has no reverse dependencies.
      return;
    }

    let slot =
      this.reverseDependencies.constNameToReverseDependencies.get(constName);

    if (typeof slot === 'undefined') {
      slot = new ExpressionReverseDependencies(expressionSourceCode);
      this.reverseDependencies.constNameToReverseDependencies.set(
        constName,
        slot,
      );
    } else {
      if (slot.lastExpressionSourceCode !== expressionSourceCode) {
        throw new InternalInterpreterError(
          `Expression string for csvgConst changed during \
document evaluation!  Constant name: ${JSON.stringify(constName)} \
previous expression source code: ${JSON.stringify(slot.lastExpressionSourceCode)}, \
current expression source code: ${JSON.stringify(expressionSourceCode)}.`,
        );
      }
    }

    switch (typeof dependentExpression) {
      case 'string':
        slot.reverseDependencies.addConstant(dependentExpression);
        break;
      case 'object':
        slot.reverseDependencies.addAttributeCalculation(dependentExpression);
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${dependentExpression}`,
        );
    }
  }

  private addLastExpressionDependencyOnAttributeCalculation(
    attributeCalculationDefinition: HashableAttributeCalculationDefinition,
  ): void {
    const dependentExpression =
      this.expressionsUnderEvaluation[
        this.expressionsUnderEvaluation.length - 1
      ];

    if (typeof dependentExpression === 'undefined') {
      // A top-level expression call has no reverse dependencies.
      return;
    }

    let slot =
      this.reverseDependencies.attributeCalculationToReverseDependencies.get(
        attributeCalculationDefinition,
      );

    if (typeof slot === 'undefined') {
      slot = new ExpressionReverseDependencies(
        attributeCalculationDefinition.sourceCode,
      );
      this.reverseDependencies.attributeCalculationToReverseDependencies.set(
        attributeCalculationDefinition,
        slot,
      );
    } else {
      const sourceCode = attributeCalculationDefinition.sourceCode;
      if (slot.lastExpressionSourceCode !== sourceCode) {
        throw new InternalInterpreterError(
          `Expression string for Attribute Calculation changed during \
document evaluation!  Attribute Calculation: \
${JSON.stringify(attributeCalculationDefinition.toStringifiable())} previous \
last expression source code: ${JSON.stringify(slot.lastExpressionSourceCode)}.`,
        );
      }
    }

    switch (typeof dependentExpression) {
      case 'string':
        slot.reverseDependencies.addConstant(dependentExpression);
        break;
      case 'object':
        slot.reverseDependencies.addAttributeCalculation(
          attributeCalculationDefinition,
        );
        break;
      default:
        throw new InternalInterpreterError(
          `Unrecognized expression: ${dependentExpression}`,
        );
    }
  }

  private createJinjaGlobalScope(): JinjaEvaluationScope {
    return this.jinjaEvaluator.createGlobalScope(
      new CsvgGlobalNamespaceForEvaluation(this).toEvaluationObject(),
    );
  }

  invalidateAttributeCalculation(
    calculationDefinition: HashableAttributeCalculationDefinition,
  ): void {
    this.calculatedAttributeDefinitions.delete(calculationDefinition);
    this.reverseDependencies.attributeCalculationToReverseDependencies.delete(
      calculationDefinition,
    );
  }

  invalidateAttributeWithExpressionAttr(expressionSource: Attr): void {
    const calculationDefinition =
      this.documentEvaluationInformation.documentReferencedElements.getAttributeCalculationDefinitionForExpressionAttr(
        expressionSource,
      );

    if (!calculationDefinition) {
      console.error(
        'An attribute defining an attribute calculation expression must \
have a recorded HashableAttributeCalculationDefinition!',
        { expressionSource, calculationDefinition },
      );
      return;
    }

    this.invalidateAttributeCalculation(calculationDefinition);
  }

  renderCalculatedAttribute(
    calculationDefinition: HashableAttributeCalculationDefinition,
  ): void {
    const { disallowedAttributeCalculations, calculatedAttributeDefinitions } =
      this;
    const { sourceCode, sourceAttr } = calculationDefinition;

    if (disallowedAttributeCalculations.has(calculationDefinition)) {
      throw new CircularAttributeSettingExpressionError({
        expressionString: sourceCode,
        expressionDefinitionAttribute: sourceAttr,
        dependencyChain: Array.from(this.expressionsUnderEvaluation),
      });
    }

    this.addLastExpressionDependencyOnAttributeCalculation(
      calculationDefinition,
    );

    if (sourceCode === null) {
      console.debug(
        `Skipping null expression attribute: ${calculateAttrXPath(sourceAttr)}`,
      );

      return;
    }

    if (calculatedAttributeDefinitions.has(calculationDefinition)) {
      console.debug(
        `Skipping already-rendered attribute: ${calculateAttrXPath(sourceAttr)}`,
      );

      return;
    }

    const ownerElement = sourceAttr.ownerElement;
    if (ownerElement === null) {
      throw new InternalInterpreterError(
        `Can't render an attribute expression for attribute that's not part of \
an element!  Attribute name: ${JSON.stringify(sourceAttr.name)}, \
expression: ${JSON.stringify(sourceCode)}`,
      );
    }

    const outputAttributeQualifiedName =
      calculationDefinition.getOutputAttrName(
        this.documentEvaluationInformation,
      );

    disallowedAttributeCalculations.add(calculationDefinition);
    this.expressionsUnderEvaluation.push(calculationDefinition);

    const expressionValue =
      calculationDefinition.evaluateStringExpression(this);

    if (this.expressionsUnderEvaluation.pop() !== calculationDefinition) {
      throw new InternalInterpreterError(
        `Corrupt 'expressionsUnderEvaluationStack'!  Calling \
'evaluateJinjaTemplate' resulted in a modified stack!`,
      );
    }
    disallowedAttributeCalculations.delete(calculationDefinition);

    // Avoid triggering `MutationObserver` updates:
    const skipDomUpdate =
      ownerElement.getAttribute(outputAttributeQualifiedName) ===
      expressionValue;
    if (!skipDomUpdate) {
      ownerElement.setAttribute(outputAttributeQualifiedName, expressionValue);
    }

    console.debug('Rendered Jinja expression attribute.', {
      expressionAttribute: calculationDefinition,
      outputAttributeQualifiedName,
      value: expressionValue,
      elementPath: calculateElementXPath(ownerElement),
      skippingDomUpdateWhichIsNoOp: skipDomUpdate,
      reverseDependencies:
        this.reverseDependencies.attributeCalculationToReverseDependencies
          .get(calculationDefinition)
          ?.toWebBuiltIns(),
    });

    calculatedAttributeDefinitions.add(calculationDefinition);
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

    // Render descendants, which may affect this element:
    for (const nearestDescendent of referencedElement.closestDescendants.values()) {
      this.renderElement(nearestDescendent.element);
    }

    // Render attribute expressions:
    for (const attrLocalNameToCalculation of referencedElement.attrNamespaceUriToLocalNameToCalculation.values()) {
      for (const attrCalculation of attrLocalNameToCalculation.values()) {
        this.renderCalculatedAttribute(attrCalculation);
      }
    }

    console.debug('Rendered element.', {
      element: element,
      reverseDependencies: this.reverseDependencies.elementToReverseDependencies
        .get(element)
        ?.toWebBuiltIns(),
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
    const definition =
      this.documentEvaluationInformation.getConstDefinition(constName);

    if (typeof definition === 'undefined') {
      throw new UndefinedConstantError({ constName });
    }

    if (this.disallowedConstNames.has(constName)) {
      throw new CircularConstantDefinitionError({
        constName,
        dependencyChain: Array.from(this.disallowedConstNames),
      });
    }

    const sourceCode = definition.expression.sourceCode;

    this.addLastExpressionDependencyOnConst(constName, sourceCode);

    if (this.constNameToValue.has(constName)) {
      const result = this.constNameToValue.get(constName);
      console.debug(
        `Returning already-calculated constant ${JSON.stringify(constName)}=${JSON.stringify(result)}.`,
      );

      return result;
    }

    this.disallowedConstNames.add(constName);
    this.expressionsUnderEvaluation.push(constName);

    let expressionValue: unknown;
    try {
      expressionValue = definition.evaluate(this);
    } catch (e) {
      if (e instanceof InvalidExpressionError) {
        e.add_note(`While evaluating constant ${JSON.stringify(constName)}`);
        e.add_note(
          `For constant defined in element at path: ${definition.getDefinitionXPath()}`,
        );
      }
      throw e;
    }

    console.debug('Rendered constant.', {
      name: constName,
      value: expressionValue,
      reverseDependencies:
        this.reverseDependencies.constNameToReverseDependencies
          .get(constName)
          ?.toWebBuiltIns(),
    });

    this.constNameToValue.set(constName, expressionValue);

    if (this.expressionsUnderEvaluation.pop() !== constName) {
      throw new InternalInterpreterError(
        `Corrupt 'expressionsUnderEvaluationStack'!  Calling \
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
    for (const attrCalculation of calculables.attributeCalculations) {
      this.invalidateAttributeCalculation(attrCalculation);
    }
    for (const element of calculables.elements) {
      this.invalidateElement(element);
    }
  }

  calculateInvalidatedCalculables(calculables: InvalidatedCalculables): void {
    // * No need to re-calculate constants explicitly, they're not visible in
    //   the DOM, only to other expressions.
    // * No need to re-calculate `Element`s explicitly, either.  They're
    //   calculated by re-rendering calculated attributes.
    for (const attrCalculation of calculables.attributeCalculations) {
      this.renderCalculatedAttribute(attrCalculation);
    }
  }

  clearCalculationCache(): void {
    this.calculatedAttributeDefinitions.clear();
    this.renderedElements.clear();
    this.constNameToValue.clear();
    this.reverseDependencies.clear();
  }
}
