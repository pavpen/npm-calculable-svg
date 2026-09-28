import { AttributeDependencies } from './attribute-dependencies';
import { AttributeDependencyCalculator } from './attribute-dependency-calculator';
import { DocumentEvaluationInformation } from './document-evaluation-information';
import { EvaluationState } from './evaluation-helpers';
import { InvalidAttributeValue } from './faults';
import { JinjaEvaluator } from './jinja-evaluator';
import { csvg_attribute_names, csvg_namespace } from './xml-names';

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

  constructor(document: Document) {
    this.document = document;

    // Calculate expression dependencies, and other information:
    const evaluationInformation = new DocumentEvaluationInformation();
    evaluationInformation.calculateForDocument(document);

    this.evaluationInformation = evaluationInformation;

    // Cretae an expression evaluation environment:
    const jinjaEvaluator = new JinjaEvaluator();
    this.evaluationState = new EvaluationState({
      documentEvaluationInformation: evaluationInformation,
      jinjaEvaluator,
    });

    this.options = new CsvgDocumentOptions({});
    this.options.calculateFromRootNode(this.getRootNode());
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
    this.evaluationInformation.calculateForDocument(this.document);

    this.options.calculateFromRootNode(this.getRootNode());

    for (const element of this.evaluationInformation.getRootReferencedElements()) {
      this.evaluationState.renderElement(element.element);
    }
  }

  render() {
    this.evaluateOnce();

    if (this.options.liveUpdate) {
      this.watchDocumentMutations();
    }
  }

  watchDocumentMutations(): void {
    const handleMutations: MutationCallback = (
      _mutationList,
      mutationObserver,
    ) => {
      if (this.document.isConnected) {
        console.debug('Re-evaluating Calculable SVG document:', this.document);

        mutationObserver.disconnect();
        mutationObserver.takeRecords();

        this.evaluateOnce();

        mutationObserver.observe(this.document, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      } else {
        // Adding a Calculable SVG document to a parent document must be
        // handled by the parent document.
        console.debug(
          'Disconnecting MutationObserver from document:',
          this.document,
        );

        mutationObserver.disconnect();
      }
    };

    const observer = new MutationObserver(handleMutations);

    observer.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
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
      outputElementDependencyCalculator:
        this.evaluationInformation.getElementDependencyCalculator(),
      documentEvaluationInformation: this.evaluationInformation,
      jinjaEvaluator,
    });
    attributeDependencyCalculator.calculate();

    console.debug(`Attribute-setting expression depenedencies:
${attributeDependencies.toDebugString()}`);
    console.debug(`Element dependencies:
${this.evaluationInformation.getElementDependencyCalculator().outputDependencies.toDebugString()}`);
  }
}
