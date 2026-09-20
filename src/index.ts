import { AttributeDependencies } from './lib/attribute-dependencies';
import { AttributeDependencyCalculator } from './lib/attribute-dependency-calculator';
import { DocumentEvaluationInformation } from './lib/document-evaluation-information';
import {
  createJinjaGlobalScope,
  EvaluationState,
  PartialEvaluationState,
} from './lib/evaluation-helpers';
import { InvalidAttributeValue } from './lib/faults';
import { JinjaEvaluator } from './lib/jinja-evaluator';
import { csvg_attribute_names, csvg_namespace } from './lib/xml-names';

export const showDocumentDebugInformation = (document: Document): void => {
  // Calculate expression dependencies:
  console.debug(`Calculating expression dependency graph.`);

  const documentEvaluationInformation = new DocumentEvaluationInformation();
  documentEvaluationInformation.calculateForDocument(document);

  const jinjaEvaluator = new JinjaEvaluator();
  const attributeDependencies = new AttributeDependencies();
  const attributeDependencyCalculator = new AttributeDependencyCalculator({
    outputDependencies: attributeDependencies,
    outputElementDependencyCalculator:
      documentEvaluationInformation.getElementDependencyCalculator(),
    documentEvaluationInformation,
    jinjaEvaluator,
  });
  attributeDependencyCalculator.calculate();

  console.debug(`Attribute-setting expression depenedencies:
${attributeDependencies.toDebugString()}`);
  console.debug(`Element dependencies:
${documentEvaluationInformation.getElementDependencyCalculator().outputDependencies.toDebugString()}`);
};

const evaluateDocumentOnce = (document: Document): void => {
  // Calculate expression dependencies:
  console.debug(`Collecting evaluation information.`);

  const documentEvaluationInformation = new DocumentEvaluationInformation();
  documentEvaluationInformation.calculateForDocument(document);

  // Evaluate expressions:
  console.debug(`Evaluating, and substituting expressions.`);

  const jinjaEvaluator = new JinjaEvaluator();
  const partialEvaluationState = new PartialEvaluationState({
    documentEvaluationInformation,
    jinjaEvaluator,
  });
  const evaluationState = new EvaluationState({
    ...partialEvaluationState,
    globalScope: createJinjaGlobalScope(partialEvaluationState),
  });

  for (const element of documentEvaluationInformation.getRootReferencedElements()) {
    evaluationState.renderElement(element.element);
  }
};

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

const watchDocumentMutations = (document: Document): void => {
  const handleMutations: MutationCallback = (
    _mutationList,
    mutationObserver,
  ) => {
    if (document.isConnected) {
      console.debug('Re-evaluating Calculable SVG document:', document);

      mutationObserver.disconnect();
      mutationObserver.takeRecords();

      evaluateDocumentOnce(document);

      mutationObserver.observe(document, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    } else {
      // Adding a Calculable SVG document to a parent document must be
      // handled by the parent document.
      console.debug(
        'Disconnecting MutationObserver from document:',
        document,
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
};

export const processDocument = (document: Document): void => {
  const rootNodes = document.children;

  if (rootNodes.length > 1) {
    console.warn(
      `Calculabe SVG Document has multiple root nodes \
(${rootNodes.length})!  Using default configuration.  Document:`,
      document,
    );
  } else if (rootNodes.length < 1) {
    console.debug('Ignoring empty document:', document);
    return;
  }
  const rootNode = rootNodes[0];

  evaluateDocumentOnce(document);

  if (rootNodeGetLiveUpdateOption(rootNode)) {
    watchDocumentMutations(document);
  }
};
