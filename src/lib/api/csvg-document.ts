import { AttributeDependencies } from '../private/attribute-dependencies';
import { AttributeDependencyCalculator } from '../private/attribute-dependency-calculator';
import { EvaluationState } from '../private/evaluation-helpers';
import { JinjaEvaluator } from '../private/jinja-evaluator';
import { InvalidatedCalculables } from '../private/reverse-dependencies/invalidated-calculables';
import { calculateElementXPath } from '../private/xpath-helpers';
import { csvg_xml } from '../xml-api';
import { InvalidAttributeValueError } from './faults';
import { DocumentEvaluationInformation } from './internal/document-evaluation-information';

namespace options_defaults {
  export const liveUpdate = true;
  export const styleLiveUpdateDelayMillis = 10;
}

export class CsvgDocumentOptions {
  liveUpdate: boolean;
  styleLiveUpdateDelayMillis: number;

  constructor({
    liveUpdate,
    styleLiveUpdateDelayMillis,
  }: Partial<CsvgDocumentOptions>) {
    this.liveUpdate = liveUpdate ?? options_defaults.liveUpdate;
    this.styleLiveUpdateDelayMillis =
      styleLiveUpdateDelayMillis ?? options_defaults.styleLiveUpdateDelayMillis;
  }

  calculateFromRootNode(
    rootNode: Element | null,
    evaluationInformation: DocumentEvaluationInformation,
  ): void {
    if (rootNode === null) {
      this.liveUpdate = options_defaults.liveUpdate;
      this.styleLiveUpdateDelayMillis =
        options_defaults.styleLiveUpdateDelayMillis;
    } else {
      this.liveUpdate = rootNodeGetLiveUpdateOption(
        rootNode,
        evaluationInformation,
      );
      this.styleLiveUpdateDelayMillis = rootNodeGetStyleUpdateDelayMillis(
        rootNode,
        evaluationInformation,
      );
    }
  }
}

const rootNodeGetLiveUpdateOption = (
  rootNode: Element,
  evaluationInformation: DocumentEvaluationInformation,
): boolean => {
  const targetAttributeNamespaceUri =
    csvg_xml.elements.svg.attributes.live_update.namespaceUri;
  const targetAttributeName =
    csvg_xml.elements.svg.attributes.live_update.attributeName;
  let attributeValue = null;
  for (const attribute of rootNode.attributes) {
    if (
      evaluationInformation.getAttrNamespaceUri(attribute) ===
        targetAttributeNamespaceUri &&
      evaluationInformation.getAttrLocalName(attribute) === targetAttributeName
    ) {
      attributeValue = attribute.value;
      break;
    }
  }

  switch (attributeValue) {
    case null:
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      throw new InvalidAttributeValueError({
        attributeName: targetAttributeName,
        namespaceUri: targetAttributeNamespaceUri,
        value: attributeValue,
        allowedValues: [null, 'true', 'false'],
      });
  }
};

const rootNodeGetStyleUpdateDelayMillis = (
  rootNode: Element,
  evaluationInformation: DocumentEvaluationInformation,
): number => {
  const targetAttributeNamespaceUri =
    csvg_xml.elements.svg.attributes.style_update_delay_millis.namespaceUri;
  const targetAttributeName =
    csvg_xml.elements.svg.attributes.style_update_delay_millis.attributeName;
  let attributeValue = null;
  for (const attribute of rootNode.attributes) {
    if (
      evaluationInformation.getAttrNamespaceUri(attribute) ===
        targetAttributeNamespaceUri &&
      evaluationInformation.getAttrLocalName(attribute) === targetAttributeName
    ) {
      attributeValue = attribute.value;
      break;
    }
  }

  if (attributeValue === null) {
    return 10;
  }

  const result = Number(attributeValue);

  if (Number.isNaN(result) || result < 0) {
    throw new InvalidAttributeValueError({
      attributeName: targetAttributeName,
      namespaceUri: targetAttributeNamespaceUri,
      value: attributeValue,
      allowedValuesDescription: 'non-negative scalars',
    });
  }

  return result;
};

type CsvgDocumentPrivateConstructorKey = symbol;
interface CsvgDocumentGlobalThis {
  $singletonsPavpenDevCsvgDocument: CsvgDocumentClassSingletons | undefined;
}
interface CsvgDocumentClassSingletons {
  svgElementToCsvgDocument: WeakMap<SVGElement, CsvgDocument>;
}

export class CsvgDocument {
  static #privateConstructorKey: CsvgDocumentPrivateConstructorKey = Symbol(
    'privateConstructorKey',
  );

  private readonly evaluationInformation: DocumentEvaluationInformation;
  private readonly evaluationState: EvaluationState;
  private readonly svgElement: SVGElement;
  private readonly options: CsvgDocumentOptions;
  private mutationObserver: MutationObserver = new MutationObserver(
    this.createHandleDocumentMutationsCallback(),
  );
  private pollStyleUpdatesTimeoutId: ReturnType<typeof setTimeout> | undefined =
    undefined;

  static forSvgElement(svgElement: SVGElement): CsvgDocument {
    let classSingletons = (globalThis as unknown as CsvgDocumentGlobalThis)
      .$singletonsPavpenDevCsvgDocument;
    if (typeof classSingletons === 'undefined') {
      classSingletons = {
        svgElementToCsvgDocument: new WeakMap<SVGElement, CsvgDocument>(),
      };
      (
        globalThis as unknown as CsvgDocumentGlobalThis
      ).$singletonsPavpenDevCsvgDocument = classSingletons;
    }
    const svgElementToCsvgDocument = classSingletons.svgElementToCsvgDocument;
    let result = svgElementToCsvgDocument.get(svgElement);

    if (typeof result === 'undefined') {
      result = new CsvgDocument(
        CsvgDocument.#privateConstructorKey,
        svgElement,
      );
      svgElementToCsvgDocument.set(svgElement, result);
    }

    return result;
  }

  constructor(
    privateConstructorKey: CsvgDocumentPrivateConstructorKey,
    svgElement: SVGElement,
  ) {
    if (privateConstructorKey !== CsvgDocument.#privateConstructorKey) {
      throw Error(
        `Don't construct CsvgDocument directly; use \
\`CsvgDocument.forSvgElement()\` instead.`,
      );
    }

    this.svgElement = svgElement;

    // Calculate expression dependencies, and other information:
    const evaluationInformation = new DocumentEvaluationInformation();
    evaluationInformation.calculateForSvgElement(svgElement);

    this.evaluationInformation = evaluationInformation;

    // Create an expression evaluation environment:
    const jinjaEvaluator = new JinjaEvaluator();
    this.evaluationState = new EvaluationState({
      documentEvaluationInformation: evaluationInformation,
      jinjaEvaluator,
    });

    this.options = new CsvgDocumentOptions({});
  }

  private evaluateOnce() {
    // Calculate expression dependencies, and other information:
    console.groupCollapsed('Evaluating Calculable SVG.', {
      path: calculateElementXPath(this.svgElement),
    });

    try {
      this.evaluationInformation.calculateForSvgElement(this.svgElement);

      this.options.calculateFromRootNode(
        this.svgElement,
        this.evaluationInformation,
      );

      for (const element of this.evaluationInformation.getRootReferencedElements()) {
        this.evaluationState.renderElement(element.element);
      }
      console.debug('Evaluated document.', {
        reverseDependencies:
          this.evaluationState.reverseDependencies.toJsValue(),
      });
    } finally {
      console.groupEnd();
    }
  }

  render() {
    this.options.calculateFromRootNode(
      this.svgElement,
      this.evaluationInformation,
    );
    this.evaluateOnce();

    if (this.options.liveUpdate) {
      this.watchDocumentMutations();

      const styleLiveUpdateDelayMillis =
        this.options.styleLiveUpdateDelayMillis;
      if (
        Number.isFinite(styleLiveUpdateDelayMillis) &&
        styleLiveUpdateDelayMillis >= 0
      ) {
        this.watchStyleUpdates();
      }
    }
  }

  private createHandleDocumentMutationsCallback(): MutationCallback {
    const handleDocumentMutations: MutationCallback = (
      _mutationList,
      mutationObserver,
    ) => {
      if (this.svgElement.isConnected) {
        console.debug(
          'Re-evaluating Calculable SVG document:',
          this.svgElement,
          ', due to mutations: ',
          _mutationList,
        );

        // Avoid mutations from applying document updates from handling
        // mutations:
        mutationObserver.disconnect();

        this.evaluateOnce();

        this.resumeMutationObserver();
      } else {
        // Adding a Calculable SVG document to a parent document must be
        // handled by the parent document.
        console.debug(
          'Disconnecting MutationObserver from document:',
          this.svgElement,
        );

        mutationObserver.disconnect();
      }
    };

    return handleDocumentMutations;
  }

  private stopAndClearMutationObserver(): void {
    this.mutationObserver.disconnect();
    this.mutationObserver.takeRecords();
  }

  private resumeMutationObserver(): void {
    this.mutationObserver.observe(this.svgElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  watchDocumentMutations(): void {
    this.resumeMutationObserver();

    console.debug('Watching for document mutations.', {
      document: this.svgElement,
    });
  }

  private handleReferencedStyleChanges(
    invalidatedCalculables: InvalidatedCalculables,
  ): void {
    if (invalidatedCalculables.isEmpty) {
      return;
    }

    console.groupCollapsed(
      'Processing invalidated calculables due to changes in referenced style.',
      invalidatedCalculables.toObject(),
    );

    try {
      this.stopAndClearMutationObserver();

      this.evaluationState.invalidateCalculables(invalidatedCalculables);
      this.evaluationState.calculateInvalidatedCalculables(
        invalidatedCalculables,
      );

      this.evaluationState.reverseDependencies.recordLastEvaluationStyle();

      console.debug(
        'Last evaluation style:',
        Array.from(
          this.evaluationState.reverseDependencies.elementToReverseDependencies.entries(),
        ).map(([element, reverseDependencies]) => ({
          element,
          lastBBox: reverseDependencies.lastBBox,
          lastBoundingClientRect: reverseDependencies.lastBoundingClientRect,
          pseudoElementNameToUsedStyleDimensionDependencies: Array.from(
            reverseDependencies.pseudoElementNameToUsedStyleDimensionDependencies.entries(),
          ).map(([pseudoElementName, reverseDependencies]) => [
            pseudoElementName,
            reverseDependencies.lastUsedStyleDimensions,
          ]),
        })),
      );

      this.resumeMutationObserver();
    } finally {
      console.groupEnd();
    }
  }

  watchStyleUpdates(): void {
    if (typeof this.pollStyleUpdatesTimeoutId !== 'undefined') {
      console.warn(
        'Call to start watching style updates when there already is a timeout \
ID for a style updates poll!  Ignoring request.',
      );
      console.trace();
      return;
    }
    const pollForStyleUpdates = () => {
      const invalidatedCalculables = new InvalidatedCalculables();

      this.evaluationState.reverseDependencies.collectCalculablesTransitivelyInvalidatedByStyle(
        invalidatedCalculables,
      );

      this.handleReferencedStyleChanges(invalidatedCalculables);

      this.pollStyleUpdatesTimeoutId = setTimeout(
        pollForStyleUpdates,
        this.options.styleLiveUpdateDelayMillis,
      );
    };

    this.pollStyleUpdatesTimeoutId = setTimeout(
      pollForStyleUpdates,
      this.options.styleLiveUpdateDelayMillis,
    );

    console.debug('Watching for style updates.', {
      document: this.svgElement,
      delayMillis: this.options.styleLiveUpdateDelayMillis,
    });
  }

  calculateDebugInformation() {
    // Calculate expression dependencies:
    console.debug(`Calculating expression dependency graph.`);

    this.evaluationInformation.calculateForSvgElement(this.svgElement);

    const jinjaEvaluator = new JinjaEvaluator();
    const attributeExpressionDependencies = new AttributeDependencies();
    const attributeDependencyCalculator = new AttributeDependencyCalculator({
      outputDependencies: attributeExpressionDependencies,
      documentReferencedElements:
        this.evaluationInformation.documentReferencedElements,
      documentEvaluationInformation: this.evaluationInformation,
      jinjaEvaluator,
    });
    attributeDependencyCalculator.calculate();

    return {
      attributeExpressionDependencies: attributeExpressionDependencies.toJs(),
      referencedElements:
        this.evaluationInformation.documentReferencedElements.toJs(),
    };
  }
}
