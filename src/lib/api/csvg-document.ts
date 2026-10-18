import { AttributeDependencies } from '../attribute-dependencies';
import { AttributeDependencyCalculator } from '../attribute-dependency-calculator';
import { DocumentEvaluationInformation } from '../document-evaluation-information';
import { EvaluationState } from '../evaluation-helpers';
import { InvalidAttributeValue } from '../faults';
import { JinjaEvaluator } from '../jinja-evaluator';
import { InvalidatedCalculables } from '../reverse-dependencies/invalidated-calculables';
import { csvg_attribute_names, csvg_namespace } from '../xml-names';

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

  calculateFromRootNode(rootNode: Element | null): void {
    if (rootNode === null) {
      this.liveUpdate = options_defaults.liveUpdate;
      this.styleLiveUpdateDelayMillis =
        options_defaults.styleLiveUpdateDelayMillis;
    } else {
      this.liveUpdate = rootNodeGetLiveUpdateOption(rootNode);
      this.styleLiveUpdateDelayMillis =
        rootNodeGetStyleUpdateDelayMillis(rootNode);
    }
  }
}

const rootNodeGetLiveUpdateOption = (rootNode: Element): boolean => {
  const attributeValue = rootNode.getAttributeNS(
    csvg_namespace.namespace,
    csvg_attribute_names.liveUpdate,
  );

  switch (attributeValue) {
    case null:
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      throw new InvalidAttributeValue({
        name: csvg_attribute_names.liveUpdate,
        namespace: csvg_namespace.namespace,
        value: attributeValue,
        allowedValues: [null, 'true', 'false'],
      });
  }
};

const rootNodeGetStyleUpdateDelayMillis = (rootNode: Element): number => {
  const attributeValue = rootNode.getAttributeNS(
    csvg_namespace.namespace,
    csvg_attribute_names.styleUpdateDelayMillis,
  );

  if (attributeValue === null) {
    return 10;
  }

  const result = Number(attributeValue);

  if (Number.isNaN(result) || result < 0) {
    throw new InvalidAttributeValue({
      name: csvg_attribute_names.styleUpdateDelayMillis,
      namespace: csvg_namespace.namespace,
      value: attributeValue,
      allowedValuesDescription: 'non-negative scalars',
    });
  }

  return result;
};

export class CsvgDocument {
  private readonly evaluationInformation: DocumentEvaluationInformation;
  private readonly evaluationState: EvaluationState;
  private readonly document: Document;
  private readonly options: CsvgDocumentOptions;
  private mutationObserver: MutationObserver = new MutationObserver(
    this.createHandleDocumentMutationsCallback(),
  );
  private pollStyleUpdatesTimeoutId: ReturnType<typeof setTimeout> | undefined =
    undefined;

  constructor(document: Document) {
    this.document = document;

    // Calculate expression dependencies, and other information:
    const evaluationInformation = new DocumentEvaluationInformation();
    evaluationInformation.calculateForDocument(document);

    this.evaluationInformation = evaluationInformation;

    // Create an expression evaluation environment:
    const jinjaEvaluator = new JinjaEvaluator();
    this.evaluationState = new EvaluationState({
      documentEvaluationInformation: evaluationInformation,
      jinjaEvaluator,
    });

    this.options = new CsvgDocumentOptions({});
  }

  private getRootNode(): Element | null {
    const rootNodes = this.document.children;

    if (rootNodes.length > 1) {
      console.warn(
        `Calculabe SVG Document has multiple root nodes \
(${rootNodes.length})!  Using default configuration.  Document:`,
        this.document,
      );
    } else if (rootNodes.length < 1) {
      return null;
    }
    return rootNodes[0];
  }

  private evaluateOnce() {
    // Calculate expression dependencies, and other information:
    console.groupCollapsed('Evaluating document.');
    try {
      this.evaluationInformation.calculateForDocument(this.document);

      this.options.calculateFromRootNode(this.getRootNode());

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
    this.options.calculateFromRootNode(this.getRootNode());
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
    const csvgDocument = this;
    const handleDocumentMutations: MutationCallback = (
      _mutationList,
      mutationObserver,
    ) => {
      if (csvgDocument.document.isConnected) {
        console.debug(
          'Re-evaluating Calculable SVG document:',
          csvgDocument.document,
          ', due to mutations: ',
          _mutationList,
        );

        // Avoid mutations from applying document updates from handling
        // mutations:
        mutationObserver.disconnect();

        csvgDocument.evaluateOnce();

        csvgDocument.resumeMutationObserver();
      } else {
        // Adding a Calculable SVG document to a parent document must be
        // handled by the parent document.
        console.debug(
          'Disconnecting MutationObserver from document:',
          csvgDocument.document,
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
    this.mutationObserver.observe(this.document, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  watchDocumentMutations(): void {
    this.resumeMutationObserver();

    console.debug('Watching for document mutations.', {
      document: this.document,
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

    const csvgDocument = this;
    const pollForStyleUpdates = () => {
      const invalidatedCalculables = new InvalidatedCalculables();

      csvgDocument.evaluationState.reverseDependencies.collectCalculablesTransitivelyInvalidatedByStyle(
        invalidatedCalculables,
      );

      csvgDocument.handleReferencedStyleChanges(invalidatedCalculables);

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
      document: this.document,
      delayMillis: this.options.styleLiveUpdateDelayMillis,
    });
  }

  showDebugInformation(): void {
    // Calculate expression dependencies:
    console.debug(`Calculating expression dependency graph.`);

    this.evaluationInformation.calculateForDocument(this.document);

    const jinjaEvaluator = new JinjaEvaluator();
    const attributeDependencies = new AttributeDependencies();
    const attributeDependencyCalculator = new AttributeDependencyCalculator({
      outputDependencies: attributeDependencies,
      documentReferencedElements:
        this.evaluationInformation.documentReferencedElements,
      documentEvaluationInformation: this.evaluationInformation,
      jinjaEvaluator,
    });
    attributeDependencyCalculator.calculate();

    console.debug(`Attribute-setting expression depenedencies:
${attributeDependencies.toDebugString()}`);
    console.debug(`Element dependencies:
${this.evaluationInformation.documentReferencedElements.toDebugString()}`);
  }
}
