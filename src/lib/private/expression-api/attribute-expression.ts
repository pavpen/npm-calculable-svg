import type { DocumentEvaluationInformation } from '../../api/internal';
import {
  xmlQualifiedNameGetLocalName,
  xmlQualifiedNameGetPrefix,
} from '../../api/internal/document-evaluation-information';
import { csvg_xml } from '../../xml-api';

export namespace attribute_expression {
  export const expressionAttributeForOutputAttributeQualifiedName = (
    ownerElement: Element,
    outputAttributeQualifiedName: string,
    evaluationInformation: DocumentEvaluationInformation,
  ): Attr | null => {
    let outputAttributeNamespaceUri =
      evaluationInformation.getNamespaceUriForNamePrefix(
        xmlQualifiedNameGetPrefix(outputAttributeQualifiedName),
      );
    if (outputAttributeNamespaceUri === null) {
      outputAttributeNamespaceUri = csvg_xml.svgNamespaceUri;
    }

    const outputAttributeLocalName = xmlQualifiedNameGetLocalName(
      outputAttributeQualifiedName,
    );
    let expressionAttributeCandidate: Attr | null = null;

    for (const attribute of ownerElement.attributes) {
      const attributeNamespaceUri =
        evaluationInformation.getAttrNamespaceUri(attribute);
      if (
        attributeNamespaceUri ===
          csvg_xml.attributes.attribute_expression.jinja.namespaceUri &&
        evaluationInformation.getAttrLocalName(attribute) ===
          outputAttributeLocalName
      ) {
        expressionAttributeCandidate = attribute;
      }
      if (
        attributeNamespaceUri ===
        csvg_xml.attributes.attribute_expression.output_attribute_name
          .namespaceUri
      ) {
        const localName = xmlQualifiedNameGetLocalName(attribute.value);
        if (
          outputAttributeNamespaceUri ===
            getNamespaceUriForOutputAttributeQualifiedName(
              attribute.value,
              evaluationInformation,
            ) &&
          outputAttributeLocalName === localName
        ) {
          return evaluationInformation.elementGetAttributeNodeNS(
            ownerElement,
            outputAttributeNamespaceUri,
            localName,
          );
        }
      }
    }

    return expressionAttributeCandidate;
  };

  const getNamespaceUriForOutputAttributeQualifiedName = (
    outputAttributeQualifiedName: string,
    evaluationInformation: DocumentEvaluationInformation,
  ): string | null =>
    evaluationInformation.getNamespaceUriForNamePrefix(
      xmlQualifiedNameGetPrefix(outputAttributeQualifiedName),
    );
}
