import { CsvgDomRect } from '../../api/csvg-dom-rect';
import { CsvgUsedStyleDimensions } from '../../api/csvg-used-style-dimensions';
import { InternalInterpreterError } from '../../api/faults';
import type {
  DocumentReferencedElements,
  HashableAttributeCalculationDefinition,
} from '../../api/internal/document-referenced-elements';
import { calculateElementXPath } from '../xpath-helpers';
import type { ElementReverseDependencies } from './element-reverse-dependencies';
import type { ExpressionReverseDependencies } from './expression-reverse-dependencies';
import type { InvalidatedCalculables } from './invalidated-calculables';

export class DocumentReverseDependencies {
  readonly elementToReverseDependencies: Map<
    Element,
    ElementReverseDependencies
  > = new Map();

  readonly constNameToReverseDependencies: Map<
    string,
    ExpressionReverseDependencies
  > = new Map();
  readonly attributeCalculationToReverseDependencies: Map<
    HashableAttributeCalculationDefinition,
    ExpressionReverseDependencies
  > = new Map();
  private readonly documentReferencedElements: DocumentReferencedElements;

  constructor({
    documentReferencedElements,
  }: { documentReferencedElements: DocumentReferencedElements }) {
    this.documentReferencedElements = documentReferencedElements;
  }

  clear(): void {
    this.elementToReverseDependencies.clear();
    this.constNameToReverseDependencies.clear();
    this.attributeCalculationToReverseDependencies.clear();
  }

  collectCalculablesDirectlyInvalidatedByStyle(
    outputInvalidatedCalculables: InvalidatedCalculables,
  ): void {
    const {
      constantNames: outputInvalidatedConstantNames,
      attributeCalculations: outputInvalidatedExpressionAttrs,
      elements: outputInvalidatedElements,
    } = outputInvalidatedCalculables;

    for (const [
      element,
      reverseDependencies,
    ] of this.elementToReverseDependencies.entries()) {
      if (reverseDependencies.calculateIsBBoxInvalidated(element)) {
        outputInvalidatedElements.add(element);

        for (const constName of reverseDependencies.bboxReverseDependencies.getConstantNames()) {
          outputInvalidatedConstantNames.add(constName);
        }
        for (const attr of reverseDependencies.bboxReverseDependencies.getAttributeCalculations()) {
          outputInvalidatedExpressionAttrs.add(attr);
        }
      }

      if (
        reverseDependencies.calculateIsBoundingClientRectInvalidated(element)
      ) {
        outputInvalidatedElements.add(element);

        for (const constName of reverseDependencies.boundingClientRectReverseDependencies.getConstantNames()) {
          outputInvalidatedConstantNames.add(constName);
        }
        for (const attr of reverseDependencies.boundingClientRectReverseDependencies.getAttributeCalculations()) {
          outputInvalidatedExpressionAttrs.add(attr);
        }
      }

      for (const [
        pseudoElementName,
        usedStyleReverseDependencies,
      ] of reverseDependencies.pseudoElementNameToUsedStyleDimensionDependencies.entries()) {
        const currentUsedStyleDimensions = new CsvgUsedStyleDimensions(
          window.getComputedStyle(element, pseudoElementName),
        );
        if (
          !currentUsedStyleDimensions.equals(
            usedStyleReverseDependencies.lastUsedStyleDimensions,
          )
        ) {
          for (const constName of usedStyleReverseDependencies.reverseDependencies.getConstantNames()) {
            outputInvalidatedConstantNames.add(constName);
          }
          for (const attr of usedStyleReverseDependencies.reverseDependencies.getAttributeCalculations()) {
            outputInvalidatedExpressionAttrs.add(attr);
          }
        }
      }
    }
  }

  collectCalculablesTransitivelyInvalidatedByStyle(
    outputInvalidatedCalculables: InvalidatedCalculables,
  ): void {
    this.collectCalculablesDirectlyInvalidatedByStyle(
      outputInvalidatedCalculables,
    );
    this.addTransitivelyInvalidatedCalculables(outputInvalidatedCalculables);
  }

  addTransitivelyInvalidatedCalculables(
    outputInvalidatedCalculables: InvalidatedCalculables,
  ): void {
    const {
      attributeCalculations: outputInvalidatedAttributeCalculations,
      constantNames: outputInvalidatedConstantNames,
      elements: outputInvalidatedElements,
    } = outputInvalidatedCalculables;

    const fringeAttrCalculations: Set<HashableAttributeCalculationDefinition> =
      new Set(outputInvalidatedAttributeCalculations);
    const fringeConstNames: Set<string> = new Set(
      outputInvalidatedConstantNames,
    );
    const nextFringeAttrCalculations: Set<HashableAttributeCalculationDefinition> =
      new Set();
    const nextFringeConstNames: Set<string> = new Set();

    while (fringeAttrCalculations.size > 0 || fringeConstNames.size > 0) {
      // Expand the next level of transitive dependencies into
      // `nextFringeAttrs`, and `nextFringeConstNames`:
      nextFringeAttrCalculations.clear();
      nextFringeConstNames.clear();

      for (const attr of fringeAttrCalculations) {
        const reverseDependencies =
          this.attributeCalculationToReverseDependencies.get(attr);
        if (typeof reverseDependencies === 'undefined') {
          continue;
        }

        for (const transitiveAttrCalculation of reverseDependencies.reverseDependencies.getAttributeCalculations()) {
          nextFringeAttrCalculations.add(transitiveAttrCalculation);
        }
        for (const transitiveConstName of reverseDependencies.reverseDependencies.getConstantNames()) {
          nextFringeConstNames.add(transitiveConstName);
        }
      }
      for (const constName of fringeConstNames) {
        const reverseDependencies =
          this.constNameToReverseDependencies.get(constName);

        if (typeof reverseDependencies === 'undefined') {
          continue;
        }

        for (const transitiveAttr of reverseDependencies.reverseDependencies.getAttributeCalculations()) {
          nextFringeAttrCalculations.add(transitiveAttr);
        }
        for (const transitiveConstName of reverseDependencies.reverseDependencies.getConstantNames()) {
          nextFringeConstNames.add(transitiveConstName);
        }
      }

      // Visit the fringe:
      fringeAttrCalculations.clear();
      fringeConstNames.clear();

      for (const attrCalculation of nextFringeAttrCalculations) {
        const element = attrCalculation.sourceAttr.ownerElement;
        if (element !== null) {
          outputInvalidatedElements.add(element);
        }
        if (!outputInvalidatedAttributeCalculations.has(attrCalculation)) {
          outputInvalidatedAttributeCalculations.add(attrCalculation);
          fringeAttrCalculations.add(attrCalculation);
        }
      }
      for (const constName of nextFringeConstNames) {
        if (!outputInvalidatedConstantNames.has(constName)) {
          outputInvalidatedConstantNames.add(constName);
          fringeConstNames.add(constName);
        }
      }
    }

    this.invalidateReferencedDescendentElements(outputInvalidatedElements);
  }

  private invalidateReferencedDescendentElements(elementSet: Set<Element>) {
    for (const element of elementSet) {
      const referencedElement =
        this.documentReferencedElements.getReferencedElement(element);
      if (typeof referencedElement === 'undefined') {
        continue;
      }
      for (const referencedDescendent of referencedElement.closestDescendants) {
        elementSet.add(referencedDescendent.element);
      }
    }
  }

  /**
   * Records current element style properties as the ones for which the current
   * CSVG expressions have been evaluated
   *
   * Changes to this recorded style trigger expression re-evaluation when
   * watching for style changes during live update.
   */
  recordLastEvaluationStyle(): void {
    for (const [
      element,
      reverseDependencies,
    ] of this.elementToReverseDependencies.entries()) {
      const lastBBox = reverseDependencies.lastBBox;
      if (lastBBox != null) {
        if (!(element instanceof SVGGraphicsElement)) {
          throw new InternalInterpreterError(
            `Element has a recorded lastBBox used by CSVG expressions, but \
it's not instanceof SVGGraphicsElement (which defines the \`getBBox\` method)!`,
          );
        }
        const currentBBox = new CsvgDomRect(element.getBBox());
        if (!currentBBox.equals(lastBBox)) {
          console.warn(
            'An element BBox, on which CSVG expressions depend, has changed \
as a result of evaluating the CSVG document!  Preventing further document \
re-calculation.',
            {
              elementPath: calculateElementXPath(element),
              lastBBox,
              currentBBox,
            },
          );
        }
        reverseDependencies.lastBBox = currentBBox;
      }

      const lastBoundingClientRect = reverseDependencies.lastBoundingClientRect;
      if (lastBoundingClientRect !== null) {
        if (!(element instanceof Element)) {
          throw new InternalInterpreterError(
            `Element has a recorded lastBoundingClientRect used by CSVG \
expressions, but it's not instanceof SVGGraphicsElement (which defines the \
\`getBoundingClientRect\` method)!`,
          );
        }
        const currentBoundingClientRect = new CsvgDomRect(
          element.getBoundingClientRect(),
        );
        if (!currentBoundingClientRect.equals(lastBoundingClientRect)) {
          console.warn(
            'An element BoundingClientRect, on which CSVG expressions depend, \
has changed as a result of evaluating the CSVG document!  Preventing further \
document re-calculation.',
            {
              elementPath: calculateElementXPath(element),
              lastBoundingClientRect,
              currentBoundingClientRect,
            },
          );
        }
        reverseDependencies.lastBoundingClientRect = currentBoundingClientRect;
      }

      for (const [
        pseudoElementName,
        usedStyleReverseDependencies,
      ] of reverseDependencies.pseudoElementNameToUsedStyleDimensionDependencies.entries()) {
        const currentUsedStyleDimensions = new CsvgUsedStyleDimensions(
          window.getComputedStyle(element, pseudoElementName),
        );
        if (
          !currentUsedStyleDimensions.equals(
            usedStyleReverseDependencies.lastUsedStyleDimensions,
          )
        ) {
          console.warn(
            'An element UsedStyleDimensions, on which CSVG expressions depend, \
has changed as a result of evaluating the CSVG document!  Preventing further \
document re-calculation.',
            {
              elementPath: calculateElementXPath(element),
              pseudoElementName,
              lastUsedStyleDimensions:
                usedStyleReverseDependencies.lastUsedStyleDimensions,
              currentUsedStyleDimensions,
            },
          );
        }
        usedStyleReverseDependencies.lastUsedStyleDimensions =
          currentUsedStyleDimensions;
      }
    }
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      elementToReverseDependencies: new Map(
        Array.from(this.elementToReverseDependencies.entries()).map(
          ([element, reverseDependencies]) => [
            element,
            reverseDependencies.toWebBuiltIns(),
          ],
        ),
      ),
      constNameToReverseDependencies: Object.fromEntries(
        Array.from(this.constNameToReverseDependencies.entries()).map(
          ([constName, reverseDependencies]) => [
            constName,
            reverseDependencies.toWebBuiltIns(),
          ],
        ),
      ),
      attributeCalculationToReverseDependencies: Array.from(
        this.attributeCalculationToReverseDependencies.entries(),
      ).map(([attributeCalculation, reverseDependencies]) => [
        attributeCalculation.toWebBuiltIns(),
        reverseDependencies.toWebBuiltIns(),
      ]),
    });
  }

  /**
   * Returns the instance represented as primitive types serializable by
   * `JSON.stringify` (Object, Array, string, number, boolean, undefined,
   * null)
   */
  toStringifiable() {
    return Object.freeze({
      elementToReverseDependencies: Object.fromEntries(
        Array.from(this.elementToReverseDependencies.entries()).map(
          ([element, reverseDependencies]) => [
            calculateElementXPath(element),
            reverseDependencies.toStringifiable(),
          ],
        ),
      ),
      constNameToReverseDependencies: Object.fromEntries(
        Array.from(this.constNameToReverseDependencies.entries()).map(
          ([constName, reverseDependencies]) => [
            constName,
            reverseDependencies.toStringifiable(),
          ],
        ),
      ),
      attributeCalculationToReverseDependencies: new Map(
        Array.from(
          this.attributeCalculationToReverseDependencies.entries(),
        ).map(([attributeCalculation, reverseDependencies]) => [
          attributeCalculation.toStringifiable(),
          reverseDependencies.toStringifiable(),
        ]),
      ),
    });
  }
}
