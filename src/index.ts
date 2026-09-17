import { AttributeDependencies } from './lib/attribute-dependencies';
import { AttributeDependencyCalculator } from './lib/attribute-dependency-calculator';
import { DocumentEvaluationInformation } from './lib/document-evaluation-information';
import {
  createJinjaGlobalScope,
  EvaluationState,
  PartialEvaluationState,
} from './lib/evaluation-helpers';
import { JinjaEvaluator } from './lib/jinja-evaluator';

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

export const processDocument = (document: Document): void => {
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
